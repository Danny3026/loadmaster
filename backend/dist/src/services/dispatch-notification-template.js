import { ValidationError } from '../utils/errors';
export const DEFAULT_DISPATCH_NOTIFICATION_TEMPLATE = `New Dispatch from {{company_name}}
Load #{{load_number}}
Pickup: {{pickup_location}}
{{pickup_date}}
Delivery: {{delivery_location}}
{{delivery_date}}
Miles: {{miles}}
Open the driver app for full details.`;
export const DISPATCH_NOTIFICATION_PLACEHOLDERS = [
    'company_name',
    'load_number',
    'driver_name',
    'pickup_location',
    'pickup_date',
    'delivery_location',
    'delivery_date',
    'miles',
    'broker_name',
    'commodity',
];
const supported = new Set(DISPATCH_NOTIFICATION_PLACEHOLDERS);
const redactedLegacyPlaceholders = new Set(['rate']);
export const validateDispatchNotificationTemplate = (template) => {
    if (typeof template !== 'string' || !template.trim()) {
        throw new ValidationError('Dispatch notification template cannot be empty.');
    }
    if (template.length > 4000) {
        throw new ValidationError('Dispatch notification template must be 4,000 characters or fewer.');
    }
    const tokens = [...template.matchAll(/{{\s*([^{}]+?)\s*}}/g)];
    const unsupported = [...new Set(tokens.map((match) => match[1].trim())
            .filter((name) => !supported.has(name) && !redactedLegacyPlaceholders.has(name)))];
    if (unsupported.length) {
        throw new ValidationError(`Unsupported dispatch template placeholder(s): ${unsupported.join(', ')}.`);
    }
    return template;
};
export const renderDispatchNotificationTemplate = (template, values) => template.replace(/{{\s*([^{}]+?)\s*}}/g, (_match, rawName) => {
    const name = rawName.trim();
    if (redactedLegacyPlaceholders.has(name))
        return '';
    if (!supported.has(name))
        return '';
    const value = values[name];
    return value === null || value === undefined ? '' : String(value);
});
