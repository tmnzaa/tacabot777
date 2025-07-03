const OWNER_NUM = '6282333014459';

module.exports = async (sock, msg) => {
  const from = msg.key.remoteJid;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (from.endsWith('@g.us')) return; // hanya chat pribadi

  const command = text.toLowerCase().trim();

  if (command === '.menu') {
    return sock.sendMessage(from, {
      text: `📋 *MENU UTAMA - TACATIC BOT 04*\n\n🌟 Aku bisa bantu kamu jagain grup lohh~\nPilih aja yang kamu mau:\n\n• 🎮 _.fitur_  – Liat semua kekuatan botku!\n• 💸 _.sewa_   – Info sewa (murce!)\n• 🙋‍♂️ _.owner_ – Chat abang owner botku 💌`
    });
  }

  if (command === '.fitur') {
    return sock.sendMessage(from, {
      text: `🛡️ *FITUR JAGA GRUP – TACATIC BOT 04*\n\nAku bisa bantu kamu jagain grup dari yang nakal-nakal 😼:\n\n• 🚫 _.antilink1 on/off_\n• 🚷 _.antilink2 on/off_\n• 📢 _.antipromosi on/off_\n• 🤬 _.antitoxic on/off_\n• 🎉 _.welcome on/off_\n• 🗣️ _.tagall_\n• 👢 _.kick_\n• 👑 _.promote_\n• 🧹 _.demote_\n• 🔓 _.open / .open 20.00_\n• 🔒 _.close / .close 22.00_`
    });
  }

  if (command === '.sewa') {
    return sock.sendMessage(from, {
      text: `🛡️ *INFO SEWA TACATIC BOT 04*\n\n💰 3K = 1 minggu\n💰 5K = 1 bulan\n💰 7K = 2 bulan\n\nKetik langsung di grup:\n_.aktifbot3k_ / _.aktifbot5k_ / _.aktifbot7k_\n\n⚠️ Aktivasi hanya oleh Owner Bot.`
    });
  }

  if (command === '.owner') {
    return sock.sendMessage(from, {
      text: `🙋‍♂️ *OWNER TACATIC BOT 04*\n\nHubungi:\nhttps://wa.me/${OWNER_NUM}`
    });
  }
};
