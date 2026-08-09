# 💊 Pastillero Digital — Cronos Salud

**Asistente inteligente de medicación, confirmación de tomas y botón de auxilio para adultos mayores y pacientes crónicos.**

> **Paz mental para vos. Independencia para ellos.**  
> Diseñado con botones gigantes, alto contraste, confirmación de voz auditiva y alertas automáticas a familiares cuidadores (auditores).

---

## 📋 Tabla de Contenidos
1. [Estado del Proyecto y Novedades](#-estado-del-proyecto-y-novedades)
2. [Estrategia Comercial y Técnica: Solución Híbrida](#-estrategia-comercial-y-tcnica-solucin-hbrida)
3. [Estructura de Base de Datos (Supabase SQL)](#-estructura-de-base-de-datos-supabase-sql)
4. [Integración Automática con Hotmart (Webhook)](#-integracin-automtica-con-hotmart-webhook)
5. [Guía de Empaquetado para Google Play con Capacitor](#-gua-de-empaquetado-para-google-play-con-capacitor)
6. [Sistema de Avisos y Notificaciones (WhatsApp / Push / Voz)](#-sistema-de-avisos-y-notificaciones)
7. [Mapa de Archivos del Repositorio](#-mapa-de-archivos-del-repositorio)

---

## 🚀 Estado del Proyecto y Novedades

- ✅ **Sintaxis de `app_4.html` reparada al 100%:** Se eliminaron las líneas de texto/chat pegadas accidentalmente. La aplicación vuelve a inicializar correctamente con Supabase Auth y base de datos.
- ✅ **Soporte PWA e Iconos:** Generado el icono `icon-512.png` de alta resolución para cumplir con los estándares de Google Play y Progressive Web Apps.
- ✅ **Service Worker actualizado (`sw.js`):** Cacheo relativo y tolerante a fallos para soporte sin conexión (*offline-first*).
- ✅ **Preparación para Capacitor (`package.json`, `capacitor.config.json`, `prepare-www.js`):** Listo para generar el proyecto Android nativo con un solo comando.
- ✅ **Edge Functions listas en `supabase/functions/`:**
  - `hotmart-webhook`: Activa o cancela suscripciones automáticamente cuando el cliente paga por Hotmart (tarjeta, Pix o efectivo).
  - `dynamic-handler`: Envía los avisos de dosis tomada, dosis omitida y botón de emergencia de 2 segundos.

---

## 💡 Estrategia Comercial y Técnica: Solución Híbrida

Para maximizar ingresos sin incurrir en costos fijos elevados:

```text
 ┌───────────────────────────────────────────┐     ┌───────────────────────────────────────────┐
 │        CANAL 1: HOTMART (Venta Web)       │     │     CANAL 2: GOOGLE PLAY (App Nativa)     │
 │ • Tarjetas de crédito/débito              │     │ • Búsqueda orgánica en Play Store         │
 │ • PIX (Brasil - altísima conversión)      │     │ • Pago en 1 toque con Google Play Billing │
 │ • Red mundial de Afiliados                │     │ • Confianza y presencia en la tienda      │
 └─────────────────────┬─────────────────────┘     └─────────────────────┬─────────────────────┘
                       │                                                 │
                       ▼                                                 ▼
          ┌───────────────────────────┐                     ┌───────────────────────────┐
          │      HOTMART WEBHOOK      │                     │    GOOGLE PLAY BILLING    │
          └────────────┬──────────────┘                     └────────────┬──────────────┘
                       │                                                 │
                       └───────────────────► ◄───────────────────────────┘
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │     SUPABASE DATABASE & RLS   │
                             │  `pastillero_subs.active = t` │
                             └───────────────┬───────────────┘
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │       APLICACIÓN CLIENTE      │
                             │   (Capacitor Android / PWA)   │
                             └───────────────────────────────┘
```

---

## 🗄️ Estructura de Base de Datos (Supabase SQL)

El script SQL completo y listo para ejecutar en el panel de Supabase se encuentra en [`supabase/schema.sql`](supabase/schema.sql).

### Tablas Principales:
1. **`pastillero_users`**: Perfil del paciente (`patient_name`), teléfono del auditor principal (`auditor_phone`), auditor secundario (`auditor2_phone`) y notas médicas.
2. **`pastillero_schedules`**: Horarios configurados (`08:00`, `14:00`, `21:00`), nombre del medicamento y minutos de margen de gracia.
3. **`pastillero_logs`**: Historial auditable de tomas (`dose_taken`), omisiones (`missed_dose`) y emergencias (`emergency`).
4. **`pastillero_subs`**: Estado de pago (`active = true/false`), proveedor (`hotmart`, `google_play`, `mercadopago`) y fecha de vencimiento.

---

## ⚡ Integración Automática con Hotmart (Webhook)

1. En el panel de **Supabase**, desplegar la función:
   ```bash
   supabase functions deploy hotmart-webhook --no-verify-jwt
   ```
2. En el panel de **Hotmart** (Herramientas → Webhook / Notificaciones de Venta):
   - **URL de Destino:** `https://<TU-PROYECTO>.supabase.co/functions/v1/hotmart-webhook`
   - **Eventos a escuchar:** 
     - *Compra aprobada / completada* (`PURCHASE_APPROVED`, `PURCHASE_COMPLETE`)
     - *Cancelación / Reembolso* (`SUBSCRIPTION_CANCELLATION`, `PURCHASE_REFUNDED`)
   - **Token secreto (`hottok`):** Configurar en Supabase Secret con:
     ```bash
     supabase secrets set HOTMART_HOTTOK="tu-token-hottok-aqui"
     ```

---

## 📱 Guía de Empaquetado para Google Play con Capacitor

Para generar la app Android lista para Play Store:

### 1. Instalar dependencias y preparar archivos
```bash
npm install
npm run prepare-www
```

### 2. Inicializar Android
```bash
npx cap add android
npx cap sync android
```

### 3. Abrir en Android Studio y Generar el `.aab`
```bash
npx cap open android
```
- En Android Studio: Menú **Build** → **Generate Signed Bundle / APK** → Seleccionar **Android App Bundle (.aab)**.
- Subir el archivo `.aab` resultante a **Google Play Console**.

---

## 🔔 Sistema de Avisos y Notificaciones

1. **Voz Sintética Local (`SpeechSynthesis`):**  
   10 minutos antes de cada toma programada, la app le habla al paciente en español argentino (`es-AR`) o portugués (`pt-BR`) con pronunciación clara y pausada.
2. **Botón de Emergencia con Retención de 2 Segundos:**  
   Previene toques accidentales requiriendo mantener presionado 2 segundos con barra de progreso visual.
3. **Avisos por WhatsApp (Twilio / wa.me):**  
   Notifica a los auditores en tiempo real al registrarse una toma, dosis omitida o alerta de auxilio.

---

## 📂 Mapa de Archivos del Repositorio

```text
├── app_4.html               # Aplicación principal en Español (PWA / Capacitor)
├── app_brasil_1_3.html      # Aplicación principal en Portugués de Brasil
├── index_4.html             # Landing page de venta y presentación en Español
├── landing_brasil.html      # Landing page de venta en Portugués
├── manifest.json            # Manifiesto Web App para instalación en pantalla de inicio
├── sw.js                    # Service Worker (funcionamiento y cacheo offline)
├── icon-192.png             # Icono de app 192x192 px
├── icon-512.png             # Icono de app 512x512 px (Play Store / PWA)
├── capacitor.config.json    # Configuración de empaquetado nativo Android
├── package.json             # Dependencias de Capacitor y scripts de compilación
├── prepare-www.js           # Script de copia automática a la carpeta nativa www
└── supabase/
    ├── schema.sql           # Script SQL con tablas, índices y RLS
    └── functions/
        ├── hotmart-webhook/ # Webhook receptor de compras Hotmart
        └── dynamic-handler/ # Función de WhatsApp y notificaciones
```

---

*Cronos Salud — Hecho con empatía para el cuidado de nuestros adultos mayores.*
