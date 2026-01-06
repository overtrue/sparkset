import crypto from 'crypto';
import type { IBotAdapter, ParsedMessage, RichMessage } from '../types/bot_adapter.js';

/**
 * WeChat Work (企业微信) Bot Adapter
 * Implements the IBotAdapter interface for WeChat Work platform
 */
export class WeChatWorkAdapter implements IBotAdapter {
  private token = '';
  private encodingAESKey = '';
  private corpId = '';

  /**
   * Initialize adapter with WeChat Work configuration
   */
  async init(config: unknown): Promise<void> {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid WeChat Work adapter configuration');
    }

    const cfg = config as Record<string, unknown>;

    this.token = (cfg.token as string) || '';
    this.encodingAESKey = (cfg.encodingAESKey as string) || '';
    this.corpId = (cfg.corpId as string) || '';

    if (!this.token || !this.encodingAESKey || !this.corpId) {
      throw new Error('Missing required WeChat Work configuration: token, encodingAESKey, corpId');
    }
  }

  /**
   * Verify webhook signature using SHA1
   * WeChat Work uses: SHA1(token + timestamp + nonce + msg_encrypt)
   */
  verifySignature(payload: unknown, signature: string, timestamp: string): boolean {
    try {
      if (!payload || typeof payload !== 'object') {
        return false;
      }

      const data = payload as Record<string, unknown>;
      const msgEncrypt = data.msg_encrypt as string;
      const nonce = data.nonce as string;

      if (!msgEncrypt || !nonce || !timestamp || !signature) {
        return false;
      }

      // Create the string to be signed
      const signStr = [this.token, timestamp, nonce, msgEncrypt].sort().join('');

      // Calculate SHA1 hash
      const hash = crypto.createHash('sha1').update(signStr).digest('hex');

      return hash === signature.toLowerCase();
    } catch (error) {
      console.error('WeChat Work signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle WeChat Work challenge request
   * WeChat sends a challenge request with echostr parameter
   */
  handleChallenge(payload: unknown): string | null {
    try {
      if (!payload || typeof payload !== 'object') {
        return null;
      }

      const data = payload as Record<string, unknown>;

      // Check if this is a challenge request
      if (data.echostr) {
        return data.echostr as string;
      }

      return null;
    } catch (error) {
      console.error('WeChat Work challenge handling error:', error);
      return null;
    }
  }

  /**
   * Parse WeChat Work message to unified format
   */
  parseMessage(payload: unknown): ParsedMessage | null {
    try {
      if (!payload || typeof payload !== 'object') {
        return null;
      }

      const data = payload as Record<string, unknown>;

      // Extract message type
      const msgType = data.MsgType as string;

      // Only handle text messages for now
      if (msgType !== 'text') {
        return null;
      }

      const text = (data.Content as string) || '';
      const fromUserId = (data.FromUserID as string) || (data.from_user_id as string) || '';
      const messageId = (data.MsgID as string) || '';

      if (!text || !fromUserId) {
        return null;
      }

      return {
        externalUserId: fromUserId,
        externalUserName: fromUserId, // WeChat Work doesn't provide user name in webhook
        text: text.trim(),
        messageType: 'text',
        messageId,
        rawPayload: data,
      };
    } catch (error) {
      console.error('WeChat Work message parsing error:', error);
      return null;
    }
  }

  /**
   * Send text reply to WeChat Work user
   */
  async sendReply(externalUserId: string, text: string): Promise<void> {
    // TODO: Phase 2.4 - Implement actual API call to WeChat Work
    // For now, just log
    console.log(`[WeChat Work] Sending reply to ${externalUserId}: ${text}`);

    // In production, call WeChat Work API:
    // POST https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=TOKEN
    // with message body containing touser, msgtype, agentid, text.content
  }

  /**
   * Send rich message (cards, markdown) to WeChat Work user
   */
  async sendRichMessage(externalUserId: string, message: RichMessage): Promise<void> {
    // TODO: Phase 2.4 - Implement rich message sending
    console.log(`[WeChat Work] Sending rich message to ${externalUserId}:`, message);

    // Format and send based on message.type (card, markdown, etc.)
  }

  /**
   * Send error message to WeChat Work user
   */
  async sendError(externalUserId: string, error: string | Error): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const text = `❌ 处理失败: ${errorMessage}`;

    await this.sendReply(externalUserId, text);
  }
}

/**
 * Factory function to create WeChat Work adapter
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createWeChatWorkAdapter(_config?: unknown): IBotAdapter {
  return new WeChatWorkAdapter();
}
