import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('[email] SMTP 配置未完成，邮件功能已禁用');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
}

export async function sendCommentReplyNotification(
  postTitle: string,
  postUrl: string,
  commentAuthor: string,
  commentContent: string,
  replyAuthor: string,
  replyContent: string,
  recipientEmail: string
): Promise<boolean> {
  const subject = `你在「${postTitle}」的评论收到了新回复`;
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>你在「${postTitle}」的评论收到了新回复</h2>

      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>${commentAuthor}</strong> 的评论：</p>
        <p style="margin: 0;">${commentContent}</p>
      </div>

      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>${replyAuthor}</strong> 的回复：</p>
        <p style="margin: 0;">${replyContent}</p>
      </div>

      <p>
        <a href="${postUrl}" style="display: inline-block; padding: 10px 20px; background: #2196f3; color: white; text-decoration: none; border-radius: 4px;">
          查看详情
        </a>
      </p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

      <p style="color: #999; font-size: 12px;">
        此邮件由系统自动发送，请勿直接回复。
      </p>
    </div>
  `;

  return sendEmail({ to: recipientEmail, subject, html });
}

export async function sendNewCommentNotificationToAdmin(
  postTitle: string,
  postUrl: string,
  commentAuthor: string,
  commentContent: string,
  adminEmail: string
): Promise<boolean> {
  const subject = `博客「${postTitle}」收到新评论`;
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>博客文章收到新评论</h2>

      <p><strong>文章：</strong>${postTitle}</p>
      <p><strong>评论者：</strong>${commentAuthor}</p>

      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;">${commentContent}</p>
      </div>

      <p>
        <a href="${postUrl}" style="display: inline-block; padding: 10px 20px; background: #2196f3; color: white; text-decoration: none; border-radius: 4px;">
          查看并审核
        </a>
      </p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

      <p style="color: #999; font-size: 12px;">
        此邮件由系统自动发送，请勿直接回复。
      </p>
    </div>
  `;

  return sendEmail({ to: adminEmail, subject, html });
}

interface NewCommentNotificationParams {
  author: string;
  email: string | null;
  content: string;
  createdAt: Date;
  post: { id: string; title: string };
  parent: { author: string; email: string | null } | null;
}

export async function sendNewCommentNotification(params: NewCommentNotificationParams): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;

  return sendNewCommentNotificationToAdmin(
    params.post.title,
    `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/posts/${params.post.id}`,
    params.author,
    params.content,
    adminEmail
  );
}

interface ReplyNotificationParams {
  author: string;
  content: string;
  createdAt: Date;
  post: { id: string; title: string };
  parentEmail: string;
  parentAuthor: string;
}

export async function sendReplyNotification(params: ReplyNotificationParams): Promise<boolean> {
  return sendCommentReplyNotification(
    params.post.title,
    `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/posts/${params.post.id}`,
    params.parentAuthor,
    '...',
    params.author,
    params.content,
    params.parentEmail
  );
}

export async function sendTestEmail(to: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: '博客邮件测试',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>✅ 邮件配置测试成功</h2>
        <p>恭喜！你的博客邮件通知功能已正常工作。</p>
        <p>现在你将收到：</p>
        <ul>
          <li>新评论通知邮件</li>
          <li>评论回复通知邮件</li>
        </ul>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿直接回复。</p>
      </div>
    `,
  });
}