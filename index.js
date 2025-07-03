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
  console.log(`♻️ Semua fitur dinonaktifkan otomatis di ${totalReset} grup karena bot restart.`)
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

  // 📨 Pesan Masuk
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || !msg.key.remoteJid || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const sender = msg.key.participant || msg.key.remoteJid
    const isGroup = from.endsWith('@g.us')
    const isCommand = text.startsWith('.')
    const db = fs.readJsonSync(dbFile)
    db[from] = db[from] || {}
    const fitur = db[from]
    fs.writeJsonSync(dbFile, db, { spaces: 2 })

    if (!isGroup) return
    if (text === '.welcome on') {
      fitur.welcome = true
      fs.writeJsonSync(dbFile, db, { spaces: 2 })
      await sock.sendMessage(from, { text: '✅ Fitur *welcome* diaktifkan!' })
    }

    if (text === '.welcome off') {
      fitur.welcome = false
      fs.writeJsonSync(dbFile, db, { spaces: 2 })
      await sock.sendMessage(from, { text: '❌ Fitur *welcome* dimatikan.' })
    }

    if (text === '.menu') {
      await sock.sendMessage(from, {
        text: `📋 *TACATIC BOT 04 - MENU*\n\n🎉 _.welcome on/off_ → Aktifkan sambutan masuk\n\nGunakan hanya jika bot sudah admin.`
      })
    }
  })

  // 👋 Sambut Member Baru
  sock.ev.on('group-participants.update', async (update) => {
    const db = fs.readJsonSync(dbFile)
    const fitur = db[update.id]
    if (!fitur || !fitur.welcome) return

    try {
      const metadata = await sock.groupMetadata(update.id)
      const participants = update.participants

      for (const jid of participants) {
        if (update.action === 'add') {
          const pp = await sock.profilePictureUrl(jid, 'image')
            .catch(() => 'https://i.ibb.co/dG6kR8k/avatar-group.png')
          const name = metadata.participants.find(p => p.id === jid)?.notify || 'Member baru'
          await sock.sendMessage(update.id, {
            image: { url: pp },
            caption: `🎉 Selamat datang @${jid.split('@')[0]} di grup *${metadata.subject}*!\nSemoga betah ya~ 🥰`,
            mentions: [jid]
          })
        }
      }
    } catch (err) {
      console.error('❌ Error welcome:', err)
    }
  })

  startScheduler(sock)
}

function startScheduler(sock) {
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
      } catch (e) {
        console.error(`❌ Gagal update setting grup:`, e)
      }
    }

    fs.writeJsonSync(dbFile, db, { spaces: 2 })
  })
}

process.on('unhandledRejection', err => {
  console.error('💥 Unhandled Rejection:', err)
})

startBot()
