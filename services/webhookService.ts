
export const syncExpectedIncomeToMake = async (month: string, amountNis: number, extraData: Record<string, any> = {}) => {
  const WEBHOOK_URL = "https://hook.eu2.make.com/wev50s0wwuamgt8gt2j4d6jsyonr0whr";

  const payload = {
    sourceApp: "smart-gigs-payment-tracker",
    month,
    amountNis,
    updatedAt: new Date().toISOString(),
    ...extraData,
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Webhook failed with status: ${response.status}`);
    } else {
      // Optional: Log success
      // console.log("Expected income synced successfully");
    }
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
};
