import db from '../config/database';

export const DRIVER_LOAD_TYPES = ['FLATBED', 'REEFER', 'DRY_VAN', 'POWER_ONLY', 'BOX_TRUCK', 'SPRINTER_VAN', 'HOTSHOT'] as const;
export const DRIVER_PAY_TYPES = ['PER_MILE', 'PERCENT_OF_RATE'] as const;

export type DriverPayType = typeof DRIVER_PAY_TYPES[number];

export interface CompensationConfig {
  payType: DriverPayType;
  rate: number;
  source: 'DEFAULT' | 'OVERRIDE' | 'LEGACY_PERCENTAGE';
}

export class DriverCompensationService {
  async getConfig(driverId: string, loadType?: string): Promise<CompensationConfig> {
    const driver = await db('drivers')
      .leftJoin('users', 'users.id', 'drivers.user_id')
      .where('drivers.id', driverId)
      .select('drivers.default_compensation_type', 'drivers.default_compensation_rate', 'users.pay_percentage')
      .first();

    if (!driver) throw new Error('Driver not found');

    const normalizedType = loadType?.toUpperCase();
    const override = normalizedType
      ? await db('driver_compensation_rates').where({ driver_id: driverId, load_type: normalizedType }).first()
      : null;

    if (override?.rate !== null && override?.rate !== undefined) {
      return {
        payType: override.pay_type as DriverPayType,
        rate: Number(override.rate),
        source: 'OVERRIDE',
      };
    }

    if (driver.default_compensation_rate !== null && driver.default_compensation_rate !== undefined) {
      return {
        payType: (driver.default_compensation_type || 'PER_MILE') as DriverPayType,
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

  calculate(config: CompensationConfig, load: { rate?: number; loaded_miles?: number; deadhead_miles?: number }) {
    if (config.payType === 'PER_MILE') {
      return config.rate * (Number(load.loaded_miles || 0) + Number(load.deadhead_miles || 0));
    }

    return Number(load.rate || 0) * (config.rate / 100);
  }
}

export const driverCompensationService = new DriverCompensationService();