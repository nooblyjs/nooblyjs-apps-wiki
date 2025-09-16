/**
 * @fileoverview Notification Manager
 * Handles comment notifications and email alerts for the blog application.
 * Integrates with the NooblyJS Core notification system.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-17
 */

class NotificationManager {
    constructor(options = {}) {
        this.emailProvider = options.emailProvider;
        this.notificationSettings = options.notificationSettings || {
            emailOnNewComment: true,
            emailOnCommentReply: true,
            emailOnCommentApproval: false,
            adminEmailOnNewComment: true,
            adminEmailOnSpamDetected: true
        };
        this.adminEmail = options.adminEmail || 'admin@blog.local';
        this.fromEmail = options.fromEmail || 'noreply@blog.local';
        this.siteUrl = options.siteUrl || 'http://localhost:3000';
    }

    /**
     * Send notification for new comment
     */
    async notifyNewComment(comment, post, parentComment = null) {
        try {
            // Notify admin about new comment
            if (this.notificationSettings.adminEmailOnNewComment) {
                await this.sendAdminNewCommentEmail(comment, post);
            }

            // If this is a reply, notify the parent comment author
            if (parentComment && this.notificationSettings.emailOnCommentReply) {
                await this.sendReplyNotificationEmail(comment, post, parentComment);
            }

            // If comment needs moderation, notify admin
            if (comment.status === 'pending') {
                await this.sendModerationRequiredEmail(comment, post);
            }

        } catch (error) {
            console.error('Error sending new comment notifications:', error);
        }
    }

    /**
     * Send notification when comment is approved
     */
    async notifyCommentApproved(comment, post) {
        try {
            if (this.notificationSettings.emailOnCommentApproval && comment.email) {
                await this.sendCommentApprovedEmail(comment, post);
            }
        } catch (error) {
            console.error('Error sending comment approval notification:', error);
        }
    }

    /**
     * Send notification when spam is detected
     */
    async notifySpamDetected(comment, post) {
        try {
            if (this.notificationSettings.adminEmailOnSpamDetected) {
                await this.sendSpamDetectedEmail(comment, post);
            }
        } catch (error) {
            console.error('Error sending spam detection notification:', error);
        }
    }

    /**
     * Send new comment notification to admin
     */
    async sendAdminNewCommentEmail(comment, post) {
        if (!this.emailProvider) return;

        const subject = `New Comment on "${post.title}"`;
        const postUrl = `${this.siteUrl}/applications/blog/posts/${post.slug}`;
        const moderationUrl = `${this.siteUrl}/applications/blog/admin/stories`;

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #1a1a1a; margin: 0;">New Comment Received</h2>
                </div>

                <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #333; margin-top: 0;">Post: ${post.title}</h3>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Author:</strong> ${comment.authorName}</p>
                        ${comment.email ? `<p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${comment.email}</p>` : ''}
                        <p style="margin: 0 0 10px 0;"><strong>Status:</strong> ${comment.status}</p>
                        <p style="margin: 0;"><strong>Posted:</strong> ${new Date(comment.createdAt).toLocaleString()}</p>
                    </div>

                    <div style="border-left: 3px solid #007bff; padding-left: 15px; margin: 15px 0;">
                        <p style="margin: 0; font-style: italic;">"${comment.content}"</p>
                    </div>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <a href="${postUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">View Post</a>
                    <a href="${moderationUrl}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Moderate Comments</a>
                </div>

                <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px;">
                    <p>This is an automated notification from your blog.</p>
                </div>
            </div>
        `;

        const textContent = `
New Comment Received

Post: ${post.title}
Author: ${comment.authorName}
${comment.email ? `Email: ${comment.email}` : ''}
Status: ${comment.status}
Posted: ${new Date(comment.createdAt).toLocaleString()}

Comment: "${comment.content}"

View Post: ${postUrl}
Moderate Comments: ${moderationUrl}

This is an automated notification from your blog.
        `;

        await this.emailProvider.send({
            to: this.adminEmail,
            from: this.fromEmail,
            subject: subject,
            html: htmlContent,
            text: textContent
        });
    }

    /**
     * Send reply notification to parent comment author
     */
    async sendReplyNotificationEmail(comment, post, parentComment) {
        if (!this.emailProvider || !parentComment.email) return;

        const subject = `Someone replied to your comment on "${post.title}"`;
        const postUrl = `${this.siteUrl}/applications/blog/posts/${post.slug}#comment-${comment.id}`;

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #1a1a1a; margin: 0;">Someone replied to your comment!</h2>
                </div>

                <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #333; margin-top: 0;">On: ${post.title}</h3>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Your comment:</strong></p>
                        <p style="margin: 0; font-style: italic;">"${parentComment.content}"</p>
                    </div>

                    <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>${comment.authorName} replied:</strong></p>
                        <p style="margin: 0; font-style: italic;">"${comment.content}"</p>
                    </div>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <a href="${postUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Reply</a>
                </div>

                <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px;">
                    <p>This is an automated notification from the blog. If you don't want to receive these notifications, please contact the site administrator.</p>
                </div>
            </div>
        `;

        const textContent = `
Someone replied to your comment!

On: ${post.title}

Your comment: "${parentComment.content}"

${comment.authorName} replied: "${comment.content}"

View Reply: ${postUrl}

This is an automated notification from the blog. If you don't want to receive these notifications, please contact the site administrator.
        `;

        await this.emailProvider.send({
            to: parentComment.email,
            from: this.fromEmail,
            subject: subject,
            html: htmlContent,
            text: textContent
        });
    }

    /**
     * Send comment approval notification
     */
    async sendCommentApprovedEmail(comment, post) {
        if (!this.emailProvider) return;

        const subject = `Your comment on "${post.title}" has been approved`;
        const postUrl = `${this.siteUrl}/applications/blog/posts/${post.slug}#comment-${comment.id}`;

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #155724; margin: 0;">Your comment has been approved!</h2>
                </div>

                <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #333; margin-top: 0;">On: ${post.title}</h3>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Your comment:</strong></p>
                        <p style="margin: 0; font-style: italic;">"${comment.content}"</p>
                    </div>

                    <p>Your comment is now visible to other readers. Thank you for contributing to the discussion!</p>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <a href="${postUrl}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Your Comment</a>
                </div>

                <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px;">
                    <p>This is an automated notification from the blog.</p>
                </div>
            </div>
        `;

        const textContent = `
Your comment has been approved!

On: ${post.title}

Your comment: "${comment.content}"

Your comment is now visible to other readers. Thank you for contributing to the discussion!

View Your Comment: ${postUrl}

This is an automated notification from the blog.
        `;

        await this.emailProvider.send({
            to: comment.email,
            from: this.fromEmail,
            subject: subject,
            html: htmlContent,
            text: textContent
        });
    }

    /**
     * Send moderation required notification
     */
    async sendModerationRequiredEmail(comment, post) {
        if (!this.emailProvider) return;

        const subject = `Comment Awaiting Moderation - "${post.title}"`;
        const moderationUrl = `${this.siteUrl}/applications/blog/admin/stories`;

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #856404; margin: 0;">Comment Awaiting Moderation</h2>
                </div>

                <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #333; margin-top: 0;">Post: ${post.title}</h3>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Author:</strong> ${comment.authorName}</p>
                        ${comment.email ? `<p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${comment.email}</p>` : ''}
                        <p style="margin: 0;"><strong>Posted:</strong> ${new Date(comment.createdAt).toLocaleString()}</p>
                    </div>

                    <div style="border-left: 3px solid #ffc107; padding-left: 15px; margin: 15px 0;">
                        <p style="margin: 0; font-style: italic;">"${comment.content}"</p>
                    </div>

                    <p>This comment requires your approval before it becomes visible to other readers.</p>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <a href="${moderationUrl}" style="display: inline-block; background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Moderate Comment</a>
                </div>

                <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px;">
                    <p>This is an automated notification from your blog.</p>
                </div>
            </div>
        `;

        const textContent = `
Comment Awaiting Moderation

Post: ${post.title}
Author: ${comment.authorName}
${comment.email ? `Email: ${comment.email}` : ''}
Posted: ${new Date(comment.createdAt).toLocaleString()}

Comment: "${comment.content}"

This comment requires your approval before it becomes visible to other readers.

Moderate Comment: ${moderationUrl}

This is an automated notification from your blog.
        `;

        await this.emailProvider.send({
            to: this.adminEmail,
            from: this.fromEmail,
            subject: subject,
            html: htmlContent,
            text: textContent
        });
    }

    /**
     * Send spam detection notification
     */
    async sendSpamDetectedEmail(comment, post) {
        if (!this.emailProvider) return;

        const subject = `Spam Detected - "${post.title}"`;
        const moderationUrl = `${this.siteUrl}/applications/blog/admin/stories`;

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #721c24; margin: 0;">🚨 Spam Comment Detected</h2>
                </div>

                <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #333; margin-top: 0;">Post: ${post.title}</h3>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Author:</strong> ${comment.authorName}</p>
                        ${comment.email ? `<p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${comment.email}</p>` : ''}
                        <p style="margin: 0 0 10px 0;"><strong>IP Address:</strong> ${comment.ipAddress || 'Unknown'}</p>
                        <p style="margin: 0;"><strong>Detected:</strong> ${new Date(comment.createdAt).toLocaleString()}</p>
                    </div>

                    <div style="border-left: 3px solid #dc3545; padding-left: 15px; margin: 15px 0;">
                        <p style="margin: 0; font-style: italic;">"${comment.content}"</p>
                    </div>

                    <p>This comment has been automatically marked as spam by our detection system. Please review and take appropriate action.</p>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <a href="${moderationUrl}" style="display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Spam</a>
                </div>

                <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px;">
                    <p>This is an automated notification from your blog security system.</p>
                </div>
            </div>
        `;

        const textContent = `
🚨 Spam Comment Detected

Post: ${post.title}
Author: ${comment.authorName}
${comment.email ? `Email: ${comment.email}` : ''}
IP Address: ${comment.ipAddress || 'Unknown'}
Detected: ${new Date(comment.createdAt).toLocaleString()}

Comment: "${comment.content}"

This comment has been automatically marked as spam by our detection system. Please review and take appropriate action.

Review Spam: ${moderationUrl}

This is an automated notification from your blog security system.
        `;

        await this.emailProvider.send({
            to: this.adminEmail,
            from: this.fromEmail,
            subject: subject,
            html: htmlContent,
            text: textContent
        });
    }

    /**
     * Update notification settings
     */
    updateSettings(newSettings) {
        this.notificationSettings = {
            ...this.notificationSettings,
            ...newSettings
        };
    }

    /**
     * Set email provider
     */
    setEmailProvider(emailProvider) {
        this.emailProvider = emailProvider;
    }
}

module.exports = NotificationManager;