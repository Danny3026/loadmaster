import db from '../config/database';
export const DRIVER_LOAD_TYPES = ['FLATBED', 'REEFER', 'DRY_VAN', 'POWER_ONLY', 'BOX_TRUCK', 'SPRINTER_VAN', 'HOTSHOT'];
export const DRIVER_PAY_TYPES = ['PER_MILE', 'PERCENT_OF_RATE'];
export class DriverCompensationService {
    async getConfig(driverId, loadType) {
        const driver = await db('drivers')
            .leftJoin('users', 'users.id', 'drivers.user_id')
            .where('drivers.id', driverId)
            .select('drivers.default_compensation_type', 'drivers.default_compensation_rate', 'users.pay_percentage')
            .first();
        if (!driver)
            throw new Error('Driver not found');
        const normalizedType = loadType?.toUpperCase();
        const override = normalizedType
            ? await db('driver_compensation_rates').where({ driver_id: driverId, load_type: normalizedType }).first()
            : null;
        if (override?.rate !== null && override?.rate !== undefined) {
            return {
                payType: override.pay_type,
                rate: Number(override.rate),
                source: 'OVERRIDE',
            };
        }
        if (driver.default_compensation_rate !== null && driver.default_compensation_rate !== undefined) {
            return {
                payType: (driver.default_compensation_type || 'PER_MILE'),
                rate: Number(driver.default_compensation_rate),
                source: 'DEFAULT',
            };
        }
        return {
            payType: 'PERCENT_OF_RATE',
            rate: Number(driver.pay_percentage || 0),
            source: 'LEGACY_PERCENTAGE',
        };
    }
    calculate(config, load) {
        if (config.payType === 'PER_MILE') {
            return config.rate * (Number(load.loaded_miles || 0) + Number(load.deadhead_miles || 0));
        }
        return Number(load.rate || 0) * (config.rate / 100);
    }
}
export const driverCompensationService = new DriverCompensationService();
