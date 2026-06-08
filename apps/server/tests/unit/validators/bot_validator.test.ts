import { describe, expect, it } from 'vitest';

import { createBotValidator } from '../../../app/validators/bot.js';

describe('createBotValidator', () => {
  it('allows bot creation without a client-generated webhook URL', () => {
    const payload = createBotValidator.parse({
      name: 'Support Bot',
      type: 'wecom',
      enableQuery: true,
    });

    expect(payload.webhookUrl).toBeUndefined();
  });
});
