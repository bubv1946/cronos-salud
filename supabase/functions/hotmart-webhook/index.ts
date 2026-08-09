import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HOTMART_HOTTOK = Deno.env.get("HOTMART_HOTTOK") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Hotmart-Hottok",
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    // 1. Validar autenticidad de Hotmart (hottok)
    const tokenHeader = req.headers.get("x-hotmart-hottok") || body.hottok;
    if (HOTMART_HOTTOK && tokenHeader !== HOTMART_HOTTOK) {
      return new Response(JSON.stringify({ error: "Token Hotmart no autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = body.event || body.status;
    const buyerEmail = (
      body.data?.buyer?.email ||
      body.buyer_email ||
      body.data?.subscriber?.email ||
      ""
    ).toLowerCase().trim();

    if (!buyerEmail) {
      return new Response(JSON.stringify({ error: "No se encontró el email del comprador" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Buscar si el usuario ya existe en auth.users o pastillero_users
    const { data: userData } = await supabase
      .from("pastillero_users")
      .select("id, email")
      .ilike("email", buyerEmail)
      .maybeSingle();

    const userId = userData?.id || null;

    // 3. Evaluar el evento de Hotmart
    const isApproval = [
      "PURCHASE_APPROVED",
      "PURCHASE_COMPLETE",
      "SUBSCRIPTION_ACTIVATION",
      "PURCHASE_OUT_OF_SHOPPING_CART"
    ].includes(event);

    const isCancellation = [
      "SUBSCRIPTION_CANCELLATION",
      "PURCHASE_REFUNDED",
      "PURCHASE_CHARGEBACK",
      "PURCHASE_EXPIRED",
      "PURCHASE_CANCELED"
    ].includes(event);

    if (isApproval) {
      // Activar o registrar suscripción
      const subPayload = {
        email: buyerEmail,
        provider: "hotmart",
        status: "active",
        active: true,
        updated_at: new Date().toISOString(),
      };

      if (userId) {
        subPayload.user_id = userId;
      }

      const { error: upsertErr } = await supabase
        .from("pastillero_subs")
        .upsert(subPayload, { onConflict: "email" });

      if (upsertErr) {
        console.error("Error al activar suscripcion:", upsertErr);
        return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true, message: `Suscripción activada para ${buyerEmail}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else if (isCancellation) {
      // Desactivar suscripción
      await supabase
        .from("pastillero_subs")
        .update({ active: false, status: "canceled", updated_at: new Date().toISOString() })
        .ilike("email", buyerEmail);

      return new Response(JSON.stringify({ success: true, message: `Suscripción cancelada para ${buyerEmail}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: `Evento ${event} procesado sin cambios de estado` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Excepción en Webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
