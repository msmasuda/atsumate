export async function sendAuthEmail(to: string, subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("認証メールの送信設定がありません。");
    }
    console.info(`[認証メール:${to}] ${subject}\n${message}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text: message }),
  });
  if (!response.ok) throw new Error("認証メールを送信できませんでした。");
}
