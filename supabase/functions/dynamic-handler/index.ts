import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") || "whatsapp:+14155238886";

serve(async (req) => {
  // Manejo de CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Falta userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Obtener datos del paciente y sus auditores
    const { data: user, error: userErr } = await supabase
      .from("pastillero_users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let messageText = "";
    if (action === "dose_taken") {
      messageText = `✅ Cronos Salud: ${user.patient_name} acaba de confirmar la toma de su medicación.`;
    } else if (action === "missed_dose") {
      messageText = `⚠️ ATENCIÓN: ${user.patient_name} no confirmó su medicación en el horario programado. Por favor, verificar su estado.`;
    } else if (action === "emergency") {
      messageText = `🚨 EMERGENCIA CRONOS SALUD: ${user.patient_name} ha activado el botón de auxilio/emergencia desde la app. Comunicarse de inmediato.`;
    }

    // Enviar WhatsApp mediante Twilio si las credenciales están configuradas
    const phoneNumbers = [user.auditor_phone, user.auditor2_phone].filter(Boolean);
    let sentCount = 0;

    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && messageText) {
      for (const rawPhone of phoneNumbers) {
        // Limpiar número y agregar prefijo internacional si falta
        let phone = rawPhone.replace(/[^\d+]/g, "");
        if (!phone.startsWith("+")) phone = `+549${phone}`; // Fallback AR si no tiene código de país

        const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const authHeader = "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
        
        const params = new URLSearchParams();
        params.append("From", TWILIO_WHATSAPP_FROM);
        params.append("To", `whatsapp:${phone}`);
        params.append("Body", messageText);

        try {
          const twilioRes = await fetch(twilioEndpoint, {
            method: "POST",
            headers: {
              "Authorization": authHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          if (twilioRes.ok) sentCount++;
        } catch (twilioErr) {
          console.error(`Error enviando WhatsApp a ${phone}:`, twilioErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        patient: user.patient_name,
        messages_sent: sentCount,
        message: messageText,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
