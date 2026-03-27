// Ejecutar con: node scripts/create-users.mjs
// Requiere la SERVICE ROLE key (la que empieza por eyJ...service_role...)

const SUPABASE_URL = 'https://rmjmywfaxwdgnyrocsvq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtam15d2ZheHdkZ255cm9jc3ZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA1MjQ0NywiZXhwIjoyMDg4NjI4NDQ3fQ.8qvno7gGpCH0WGNlZsw3wpQigJFR_Gu0Z3oBiAQlV-4'

// ✏️ Cambia los emails y contraseñas si quieres
const users = [
  { email: 'aitor@hostelpro.net',    password: 'Hostelpro2024!', name: 'Aitor' },
  { email: 'jonathan@hostelpro.net', password: 'Hostelpro2024!', name: 'Jonathan' },
]

async function createUser(email, password, name) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: {},
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error(`❌ Error creando ${name}:`, data.message ?? data)
    return null
  }

  console.log(`✅ Usuario creado: ${name} (${email}) — ID: ${data.id}`)
  return data.id
}

async function updateProfileName(userId, name) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hp_profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ name }),
  })
  if (res.ok) console.log(`   ✅ Nombre actualizado a "${name}"`)
  else console.warn(`   ⚠️  No se pudo actualizar el nombre (actualízalo manualmente con UPDATE)`)
}

for (const user of users) {
  const id = await createUser(user.email, user.password, user.name)
  if (id) {
    // Esperar un momento para que el trigger cree el perfil
    await new Promise(r => setTimeout(r, 1000))
    await updateProfileName(id, user.name)
  }
}

console.log('\n🎉 Listo. Ahora pueden iniciar sesión en el panel.')
