export default function handler(req,res){
  res.status(200).json({
    ok:true,
    service:'North Capital Intelligence Data Gateway',
    version:'1.0.81',
    time:new Date().toISOString(),
    alphaVantageConfigured:!!process.env.ALPHA_VANTAGE_API_KEY
  });
}
