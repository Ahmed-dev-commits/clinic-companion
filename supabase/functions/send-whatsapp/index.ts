import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  to: string;
  patientName: string;
  reportId: string;
  clinicName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM");

    if (!accountSid || !authToken || !fromNumber) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ error: "Twilio credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, patientName, reportId, clinicName }: WhatsAppRequest = await req.json();

    // Validate required fields
    if (!to || !patientName || !reportId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, patientName, reportId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for WhatsApp (add country code if needed)
    let formattedPhone = to.replace(/\s+/g, "").replace(/-/g, "");
    if (!formattedPhone.startsWith("+")) {
      // Default to Pakistan country code if no code provided
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+92" + formattedPhone.slice(1);
      } else {
        formattedPhone = "+92" + formattedPhone;
      }
    }

    const message = `📋 *Lab Report Ready*

Dear ${patientName},

Your lab report (ID: ${reportId}) is now ready for collection.

Please visit *${clinicName || "our clinic"}* with your ID to collect your report.

Thank you for choosing us!

_This is an automated message. Please do not reply._`;

    // Twilio WhatsApp API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:${formattedPhone}`);
    formData.append("From", `whatsapp:${fromNumber}`);
    formData.append("Body", message);

    const credentials = btoa(`${accountSid}:${authToken}`);

    console.log(`Sending WhatsApp to: ${formattedPhone}`);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", result);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send WhatsApp message", 
          details: result.message || result.code 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp sent successfully:", result.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.sid,
        to: formattedPhone 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-whatsapp function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
