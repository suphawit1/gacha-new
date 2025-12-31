const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/redeem', (req, res) => {
  const { walletPhone, totalMoney } = req.body;
  
  // 🔥 ข้อมูลจะมาเด้งตรงนี้ที่เครื่องคุณครับ
  console.log("\n========================================");
  console.log("💰 มีรายการแจ้งแลกรางวัลใหม่! 💰");
  console.log(`📱 เบอร์ Wallet: ${walletPhone}`);
  console.log(`💵 จำนวนเงินรวม: ${totalMoney} บาท`);
  console.log("========================================\n");

  res.json({ status: 'ok' });
});

app.listen(3001, () => console.log('🚀 Server standby at port 3001'));