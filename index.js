const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const P = require('pino')
const { Boom } = require('@hapi/boom')
const schedule = require('node-schedule')
const fs = require('fs-extra')
const axios = require('axios')

// === File Database ===
const dbFile = './grup.json'
if (!fs.existsSync(dbFile)) fs.writeJsonSync(dbFile, {})

let qrShown = false

function resetFiturSaatRestart() {
  if (!fs.existsSync(dbFile)) return
  const db = fs.readJsonSync(dbFile)
  let totalReset = 0
  for (const id in db) {
    const fitur = db[id]
    fitur.antilink1 = false
    fitur.antilink2 = false
    fitur.antipromosi = false
    fitur.antitoxic = false
    fitur.welcome = false
    totalReset++
  }
  fs.writeJsonSync(dbFile, db, { spaces: 2 })
  console.log(`♻️ Semua fitur dimatikan di ${totalReset} grup karena restart.`)
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr && !qrShown) {
      qrShown = true
      console.log('\n📲 Scan QR untuk login:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('✅ Bot berhasil terhubung ke WhatsApp!')
      resetFiturSaatRestart()
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      const reconnect = code !== DisconnectReason.loggedOut
      console.log('❌ Terputus. Reconnect:', reconnect)
      qrShown = false
      if (reconnect) startBot()
    }
  })

  // 📥 Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return
    if (!msg.key.remoteJid || msg.key.id.startsWith('BAE5') || msg.key.fromMe) return

    try {
      require('./grup')(sock, msg)
      require('./private')(sock, msg)
    } catch (err) {
      console.error('💥 Error handle pesan:', err)
    }
  })

  // 👋 WELCOME Feature (INI YANG KAMU MAU BRO)
  sock.ev.on('group-participants.update', async (update) => {
    const db = fs.readJsonSync(dbFile)
    const fitur = db[update.id]
    if (!fitur || !fitur.welcome) return

    try {
      const metadata = await sock.groupMetadata(update.id)
      for (const jid of update.participants) {
        if (update.action === 'add') {
          const pp = await sock.profilePictureUrl(jid, 'image').catch(() => 'https://i.ibb.co/dG6kR8k/avatar-group.png')
          const name = metadata.participants.find(p => p.id === jid)?.notify || 'Teman baru'
          await sock.sendMessage(update.id, {
            image: { url: pp },
            caption: `👋 Selamat datang @${jid.split('@')[0]} di grup *${metadata.subject}*!\nJangan lupa perkenalan ya! 🙌`,
            mentions: [jid]
          })
        }
      }
    } catch (err) {
      console.error('❌ Error welcome:', err)
    }
  })

  // ⏰ AUTO OPEN & CLOSE GROUP
  schedule.scheduleJob('* * * * *', async () => {
    const now = new Date()
    const jam = now.toTimeString().slice(0, 5).replace(':', '.')
    const db = fs.readJsonSync(dbFile)

    for (const id in db) {
      const fitur = db[id]
      if (!fitur || !fitur.expired || new Date(fitur.expired) < now) continue

      try {
        if (fitur.openTime === jam) {
          await sock.groupSettingUpdate(id, 'not_announcement')
          await sock.sendMessage(id, { text: `✅ Grup dibuka otomatis jam *${jam}*` })
          delete fitur.openTime
        }

        if (fitur.closeTime === jam) {
          await sock.groupSettingUpdate(id, 'announcement')
          await sock.sendMessage(id, { text: `🔒 Grup ditutup otomatis jam *${jam}*` })
          delete fitur.closeTime
        }
      } catch (err) {
        console.error('❌ Gagal update setting:', err)
      }
    }

    fs.writeJsonSync(dbFile, db, { spaces: 2 })
  })
}

// 🛠 Global error
process.on('unhandledRejection', err => {
  console.error('💥 Unhandled Rejection:', err)
})

startBot()
