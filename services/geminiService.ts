
import { GoogleGenAI, Type } from "@google/genai";
import type { Gig, ParsedGig } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
  // In a real app, you might want to handle this more gracefully.
  // For this project, we assume it's set.
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const parseGigFromString = async (text: string): Promise<ParsedGig | null> => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const prompt = `
      מהטקסט הבא, חלץ את שם האירוע, שם הספק (הגורם המשלם), סכום התשלום במספרים, ותאריך האירוע.
      התאריך הנוכחי הוא ${currentDate}.
      פורמט הפלט עבור התאריך חייב להיות YYYY-MM-DD.
      אם השנה לא מצוינת, יש להניח שהיא השנה הנוכחית, או השנה הבאה אם התאריך כבר עבר.
      הטקסט: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The name of the gig or event." },
            supplierName: { type: Type.STRING, description: "The name of the supplier or client paying for the service." },
            paymentAmount: { type: Type.NUMBER, description: "The payment amount as a number." },
            eventDate: { type: Type.STRING, description: "The event date in YYYY-MM-DD format." }
          },
          required: ["name", "paymentAmount", "eventDate"],
        },
      },
    });

    const jsonString = response.text.trim();
    const parsedGig = JSON.parse(jsonString);

    if (parsedGig.name && parsedGig.paymentAmount && parsedGig.eventDate) {
        return parsedGig as ParsedGig;
    }
    return null;

  } catch (error) {
    console.error("Error parsing gig with AI:", error);
    return null;
  }
};


export const generateReminderEmail = async (gig: Gig): Promise<string> => {
    try {
        const prompt = `
            כתוב אימייל תזכורת תשלום מנומס אך תקיף עבור עבודת פרילנס.
            הטון צריך להיות מקצועי וידידותי.
            אנא כלול את הפרטים הבאים באימייל, בעברית:
            - שם האירוע: ${gig.name}
            - ספק (משלם): ${gig.supplierName || 'לא צוין'}
            - סכום לתשלום: ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(gig.paymentAmount)}
            - תאריך יעד: ${new Date(gig.paymentDueDate).toLocaleDateString('he-IL')}
            
            התחל בפנייה ידידותית וסיים בסגירה מקצועית.
            שמור על אימייל תמציתי.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error generating reminder email:", error);
        return "אירעה שגיאה ביצירת התזכורת. אנא נסה שוב.";
    }
};