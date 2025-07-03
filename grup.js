const fs = require('fs-extra')
const kataKasar = require('./kataKasar.json')
const dbFile = './grup.json'
const strikeFile = './strike.json'
if (!fs.existsSync(dbFile)) fs.writeJsonSync(dbFile, {})
if (!fs.existsSync(strikeFile)) fs.writeJsonSync(strikeFile, {})

const tambahHari = (jumlah) => {
  const date = new Date()
  date.setDate(date.getDate() + jumlah)
  return date.toISOString().split('T')[0]
}

module.exports = async (sock, msg) => {
  const from = msg.key.remoteJid
  if (!from.endsWith('@g.us')) return

  const sender = msg.key.participant
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
  const isCommand = text.startsWith('.') // penting!

  let metadata
  try {
    metadata = await sock.groupMetadata(from)
  } catch (err) {
    return console.error('❌ ERROR Metadata:', err.message)
  }

  const isOwner = metadata.participants.find(p => p.id === sender && p.admin === 'superadmin')
  const isAdmin = metadata.participants.find(p => p.id === sender)?.admin
  const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
  const isBotAdmin = metadata.participants.find(p => p.id === botNumber)?.admin

  if (mentions.includes(botNumber) && !isCommand) return

  const db = fs.readJsonSync(dbFile)
  db[from] = db[from] || {}
  db[from].nama = metadata.subject
  const fitur = db[from]
  fs.writeJsonSync(dbFile, db, { spaces: 2 })

  if (['.aktifbot3k', '.aktifbot5k', '.aktifbot7k'].includes(text) && !isBotAdmin) {
    return sock.sendMessage(from, { text: '⚠️ Aku harus jadi *Admin Grup* dulu sebelum bisa diaktifkan!' })
  }

  if (['.aktifbot3k', '.aktifbot5k', '.aktifbot7k'].includes(text)) {
    if (!isOwner) return sock.sendMessage(from, {
      text: '⚠️ Hanya *Owner Grup* yang bisa aktifkan bot!'
    })

    const now = new Date()
    const expiredDate = fitur.expired ? new Date(fitur.expired) : null

    if (expiredDate && expiredDate >= now) {
      return sock.sendMessage(from, {
        text: `🟢 *Bot sudah aktif di grup ini!*\n🆔 Grup ID: *${from}*\n📛 Nama Grup: *${fitur.nama || 'Tidak tersedia'}*\n📅 Aktif sampai: *${fitur.expired}*`
      })
    }

    if (text === '.aktifbot3k') fitur.expired = tambahHari(7)
    if (text === '.aktifbot5k') fitur.expired = tambahHari(30)
    if (text === '.aktifbot7k') fitur.expired = tambahHari(60)

    fs.writeJsonSync(dbFile, db, { spaces: 2 })

    return sock.sendMessage(from, {
      text: `✅ *Tacatic Bot 04* berhasil diaktifkan!\n🆔 Grup ID: *${from}*\n📛 Nama Grup: *${fitur.nama || 'Tidak tersedia'}*\n📅 Masa aktif: *${fitur.expired}*`
    })
  }

  const now = new Date().toISOString().split('T')[0]
if (!fitur.expired || new Date(fitur.expired) < new Date(now)) {
  if (isCommand && (isAdmin || isOwner)) {
    return sock.sendMessage(from, {
      text: `🕒 *Tacatic Bot 04* belum aktif di grup ini.\n\nAktifkan:\n• .aktifbot3k (1 minggu)\n• .aktifbot5k (1 bulan)\n• .aktifbot7k (2 bulan)`
    })
  }
  return // jangan lakukan apapun jika bukan command
}

  // 💡 Hanya batasi command jika bukan admin
  if (isCommand && !isAdmin && !isOwner) return
if (!isBotAdmin && isCommand && (isAdmin || isOwner)) {
  return sock.sendMessage(from, { text: '🚫 Bot belum jadi *Admin Grup*, fitur dimatikan!' })
}

  // ✅ Filter pesan (untuk semua member)
  const isLink = /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i.test(text)
const isPromo = /(slot|casino|chip|jud[iy]|unchek|judol|viral|bokep|bokep viral)/i.test(text)
const isToxic = kataKasar.some(k => text.toLowerCase().includes(k))

try {
  if (!isAdmin && !isOwner) {
    const strikeDB = fs.readJsonSync(strikeFile)
    strikeDB[from] = strikeDB[from] || {}
    strikeDB[from][sender] = strikeDB[from][sender] || 0

    const tambahStrike = async () => {
      strikeDB[from][sender] += 1
      fs.writeJsonSync(strikeFile, strikeDB, { spaces: 2 })

      if (strikeDB[from][sender] >= 5) {
        await sock.groupParticipantsUpdate(from, [sender], 'remove')
        delete strikeDB[from][sender] // reset setelah di-kick
        fs.writeJsonSync(strikeFile, strikeDB, { spaces: 2 })
      }
    }

    if (fitur.antilink1 && isLink) {
      await sock.sendMessage(from, { delete: msg.key })
      await tambahStrike()
    }

    if (fitur.antilink2 && isLink) {
      await sock.sendMessage(from, { delete: msg.key })
      await sock.groupParticipantsUpdate(from, [sender], 'remove')
      delete strikeDB[from][sender]
      fs.writeJsonSync(strikeFile, strikeDB, { spaces: 2 })
    }

    if (fitur.antipromosi && isPromo) {
      await sock.sendMessage(from, { delete: msg.key })
      await tambahStrike()
    }

    if (fitur.antitoxic && isToxic) {
      await sock.sendMessage(from, { delete: msg.key })
      await tambahStrike()
    }

    return
  }
} catch (err) {
  console.error('❌ Filter error:', err)
}

 // 📋 Menu Rapi & Menarik
if (text === '.menu') {
  return sock.sendMessage(from, {
    text: `╔═══🎀 *TACATIC BOT 04 - MENU FITUR* 🎀═══╗

📛 *FITUR KEAMANAN*:
• 🚫 _.antilink1 on/off_  → Hapus link masuk
• 🚷 _.antilink2 on/off_  → Hapus link + tendang user
• 📢 _.antipromosi on/off_  → Blok iklan dan spam
• 🤬 _.antitoxic on/off_  → Bersihin kata-kata kasar

🎉 *FITUR SOSIAL & INTERAKSI*:
• 🎉 _.welcome on/off_  → Sambutan buat member baru
• 🗣️ _.tagall_  → Mention semua member aktif
• 👢 _.kick_  → Tendang member (admin only)

🛠️ *FITUR MANAJEMEN GRUP*:
• 👑 _.promote_  → Jadikan member jadi admin
• 🧹 _.demote_  → Turunin admin
• 🔓 _.open_ / _.open 20.00_  → Buka grup / jadwal buka
• 🔒 _.close_ / _.close 22.00_  → Tutup grup / jadwal tutup

📊 *FITUR LAINNYA*:
• 💡 _.cekaktif_  → Cek fitur aktif

📌 *Catatan*:
– Hanya admin atau owner grup yang bisa akses fitur.
– Pastikan bot sudah dijadikan admin supaya bisa bekerja maksimal.

╚═════════════════════════╝`
  })
}

  // 🔁 ON / OFF FITUR (versi pintar & rapi)
const fiturList = ['antilink1', 'antilink2', 'antipromosi', 'antitoxic', 'welcome']

for (let f of fiturList) {
  if (text === `.${f} on`) {
    if (!isOwner) return sock.sendMessage(from, { text: `⚠️ Hanya *Owner Grup* yang boleh mengaktifkan fitur *${f}*.` })

    if (fitur[f]) {
      return sock.sendMessage(from, { text: `ℹ️ Fitur *${f}* sudah aktif dari tadi kok 😁` })
    }

    // 🤖 Anti double: Matikan fitur antilink yang lain
    if (f === 'antilink1' && fitur['antilink2']) {
      fitur['antilink2'] = false
      await sock.sendMessage(from, { text: `⚠️ Fitur *antilink2* dimatikan agar tidak bentrok dengan *antilink1*.` })
    }
    if (f === 'antilink2' && fitur['antilink1']) {
      fitur['antilink1'] = false
      await sock.sendMessage(from, { text: `⚠️ Fitur *antilink1* dimatikan agar tidak bentrok dengan *antilink2*.` })
    }

    fitur[f] = true
    fs.writeJsonSync(dbFile, db, { spaces: 2 })
    return sock.sendMessage(from, { text: `✅ Fitur *${f}* berhasil diaktifkan!\nAku akan standby dan menjaga dengan baik~ 😼` })
  }

  if (text === `.${f} off`) {
    if (!isOwner) return sock.sendMessage(from, { text: `⚠️ Hanya *Owner Grup* yang boleh menonaktifkan fitur *${f}*.` })

    if (!fitur[f]) {
      return sock.sendMessage(from, { text: `ℹ️ Fitur *${f}* memang sudah nonaktif kok 😴` })
    }

    fitur[f] = false
    fs.writeJsonSync(dbFile, db, { spaces: 2 })
    return sock.sendMessage(from, { text: `❌ Fitur *${f}* berhasil dimatikan.\nYasudah, aku istirahat dulu ya untuk bagian itu~ 💤` })
  }
}

  // welcome
  

  // 👮 .tagall tanpa tampil mention (silent mention)
if (text.startsWith('.tagall')) {
  const isi = text.split('.tagall')[1]?.trim()
  const list = metadata.participants.map(p => p.id)

  return sock.sendMessage(from, {
    text: isi || '', // kirim pesan kosong jika tidak ada teks (unicode blank)
    mentions: list
  })
}

  if (text.startsWith('.kick')) {
  if (!isAdmin && !isOwner) return sock.sendMessage(from, {
    text: '⚠️ Hanya admin grup yang bisa menendang member!'
  })

  if (!isBotAdmin) return sock.sendMessage(from, {
    text: '🚫 Bot belum jadi *Admin Grup*, tidak bisa menendang!'
  })

  const context = msg.message?.extendedTextMessage?.contextInfo || {}
  const mentionTarget = context.mentionedJid
  const replyTarget = context.participant
  const targets = mentionTarget?.length ? mentionTarget : replyTarget ? [replyTarget] : []

  if (!targets.length) {
    return sock.sendMessage(from, {
      text: '❌ Kamu harus tag atau reply ke orang yang ingin ditendang.'
    })
  }

  await sock.groupParticipantsUpdate(from, targets, 'remove')
  return sock.sendMessage(from, {
    text: `👢 Member dikick:\n${targets.map(jid => `• @${jid.split('@')[0]}`).join('\n')}`,
    mentions: targets
  })
}

  // 👑 Promote
if (text.startsWith('.promote') && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
  const target = msg.message.extendedTextMessage.contextInfo.mentionedJid
  await sock.groupParticipantsUpdate(from, target, 'promote')
  return sock.sendMessage(from, {
    text: `🎉 *Promosi Berhasil!*\nSelamat kepada:\n${target.map(jid => `• @${jid.split('@')[0]}`).join('\n')}\n\nKamu sekarang adalah *Admin Grup*! 🎖️`,
    mentions: target
  })
}

// 🧹 Demote
if (text.startsWith('.demote') && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
  const target = msg.message.extendedTextMessage.contextInfo.mentionedJid
  await sock.groupParticipantsUpdate(from, target, 'demote')
  return sock.sendMessage(from, {
    text: `⚠️ *Turunkan Jabatan!*\nYang tadinya admin sekarang jadi rakyat biasa:\n${target.map(jid => `• @${jid.split('@')[0]}`).join('\n')}\n\nJangan sedih ya, tetap semangat! 😅`,
    mentions: target
  })
}

  // 🔓 .open & .close
if (text.startsWith('.open')) {
  const jam = text.split(' ')[1]
  if (jam && /^\d{2}\.\d{2}$/.test(jam)) {
    fitur.openTime = jam
    fs.writeJsonSync(dbFile, db, { spaces: 2 })
    return sock.sendMessage(from, { text: `⏰ Grup akan dibuka otomatis jam *${jam}*` })
  }
  await sock.groupSettingUpdate(from, 'not_announcement')
  return sock.sendMessage(from, { text: '✅ Grup dibuka! Ayo ngobrol!' }) // <== tambahkan return
}

if (text.startsWith('.close')) {
  const jam = text.split(' ')[1]
  if (jam && /^\d{2}\.\d{2}$/.test(jam)) {
    fitur.closeTime = jam
    fs.writeJsonSync(dbFile, db, { spaces: 2 })
    return sock.sendMessage(from, { text: `⏰ Grup akan ditutup otomatis jam *${jam}*` })
  }
  await sock.groupSettingUpdate(from, 'announcement')
  return sock.sendMessage(from, { text: '🔒 Grup ditutup! Waktunya istirahat!' }) // <== tambahkan return
}

  if (text === '.cekaktif') {
  const fiturList = ['antilink1', 'antilink2', 'antipromosi', 'antitoxic', 'welcome']
  let aktif = ''
  let mati = ''

  for (let f of fiturList) {
    if (fitur[f]) {
      aktif += `✅ *${f}*\n`
    } else {
      mati += `❌ *${f}*\n`
    }
  }

  return sock.sendMessage(from, {
    text: `📊 *CEK STATUS FITUR GRUP*\n\n📛 Grup: *${fitur.nama || 'Tidak diketahui'}*\n📅 Aktif sampai: *${fitur.expired || 'Belum aktif'}*\n\n🟢 *Fitur Aktif:*\n${aktif || '-'}\n\n🔴 *Fitur Nonaktif:*\n${mati || '-'}`,
  })
}

  // 🚫 Batasi command hanya yang tersedia di bot
const allowedCommands = [
  '.menu', '.statusbot', '.aktifbot3k', '.aktifbot5k', '.aktifbot7k',
  '.antilink1 on', '.antilink1 off',
  '.antilink2 on', '.antilink2 off',
  '.antipromosi on', '.antipromosi off',
  '.antitoxic on', '.antitoxic off',
  '.welcome on', '.welcome off',
  '.open', '.close', '.tagall', '.kick', '.promote', '.demote'
]

// Cek jika pesan dimulai titik tapi bukan command yang dikenali
if (isCommand && !allowedCommands.some(cmd => text.startsWith(cmd))) {
  return // abaikan command yang tidak dikenal
}

}
