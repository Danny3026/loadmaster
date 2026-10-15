import { describe, expect, it } from 'vitest';
import {
  renderDispatchNotificationTemplate,
  validateDispatchNotificationTemplate,
} from './dispatch-notification-template';

describe('dispatch notification templates', () => {
  it('renders supported values and blanks unknown legacy placeholders', () => {
    expect(renderDispatchNotificationTemplate(
      'Load {{load_number}} for {{driver_name}} at {{unknown-field}}',
      { load_number: 'LD-10', driver_name: 'Driver A' }
    )).toBe('Load LD-10 for Driver A at ');
  });

  it('rejects unknown placeholders and unsafe rate fields on save', () => {
    expect(validateDispatchNotificationTemplate('Load {{load_number}} {{rate}}'))
      .toBe('Load {{load_number}} {{rate}}');
    expect(renderDispatchNotificationTemplate('Rate {{rate}}', { load_number: 'LD-10' })).toBe('Rate ');
    expect(() => validateDispatchNotificationTemplate('Load {{load_number}} {{account-number}}'))
      .toThrow('Unsupported dispatch template placeholder(s): account-number.');
  });

  it('rejects empty and oversized templates', () => {
    expect(() => validateDispatchNotificationTemplate('  ')).toThrow('cannot be empty');
    expect(() => validateDispatchNotificationTemplate('x'.repeat(4001))).toThrow('4,000 characters');
  });
});