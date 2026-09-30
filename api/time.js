export default function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.status(200).json({serverTime:new Date().toISOString()});
}
