#!/usr/bin/env bash
# BTE HYBRID preview bootstrap: embedded MySQL -> schema push -> demo seeds -> dev server
set -e
BASE=/opt/mysql
DATA=/data/mysql
RUNDIR=/data/run
export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu

echo "[preview] initializing MySQL datadir..."
"$BASE/bin/mysqld" --no-defaults --initialize-insecure --datadir="$DATA" --basedir="$BASE" 2>&1 | tail -1

echo "[preview] starting mysqld..."
"$BASE/bin/mysqld" --no-defaults \
  --datadir="$DATA" --basedir="$BASE" \
  --socket="$RUNDIR/mysql.sock" --pid-file="$RUNDIR/mysqld.pid" \
  --port=3307 --bind-address=127.0.0.1 --mysqlx=OFF \
  --log-error=/data/log/error.log &
for i in $(seq 1 90); do [ -S "$RUNDIR/mysql.sock" ] && break; sleep 1; done
[ -S "$RUNDIR/mysql.sock" ] || { echo "[preview] mysqld socket timeout"; tail -30 /data/log/error.log; exit 1; }

echo "[preview] creating dev database + user..."
node -e "
const mysql=require('mysql2/promise');
(async()=>{
 const c=await mysql.createConnection({socketPath:'$RUNDIR/mysql.sock',user:'root'});
 await c.query(\"CREATE DATABASE IF NOT EXISTS bte_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci\");
 await c.query(\"CREATE USER IF NOT EXISTS 'bte'@'%' IDENTIFIED BY 'bte_dev_local'\");
 await c.query(\"GRANT ALL PRIVILEGES ON bte_dev.* TO 'bte'@'%'\");
 await c.query('FLUSH PRIVILEGES');
 await c.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
"

echo "[preview] pushing Drizzle schema..."
npx drizzle-kit push --force

echo "[preview] seeding demo data..."
for s in seed seed-erp seed-daily seed-ext seed-gap seed-ingredients; do
  npx tsx "db/$s.ts" || echo "[preview] seed $s failed (non-fatal)"
done

echo "[preview] creating dev-owner admin user + IoT demo devices..."
node -e "
const mysql=require('mysql2/promise');
(async()=>{
 const c=await mysql.createConnection(process.env.DATABASE_URL);
 await c.query(\"INSERT INTO users (unionId,name,email,role,companyId) VALUES ('dev-owner','Dev Owner (demo)','dev@bte.local','admin',1) ON DUPLICATE KEY UPDATE role='admin'\");
 const types=[['climate_ctrl','Kontroler klimatu','climate_controller'],['temp_s','Czujnik temperatury','temperature_sensor'],['co2_s','Czujnik CO2','co2_sensor'],['nh3_s','Czujnik NH3','nh3_sensor'],['silo_lvl','Sonda poziomu silosu','feed_silo_level'],['bird_scale','Waga ptasia','bird_scale'],['water_m','Wodomierz','water_meter']];
 for(const [code,name,cat] of types)
  await c.query('INSERT IGNORE INTO iot_device_types (code,name,category) VALUES (?,?,?)',[code,name,cat]);
 const [t]=await c.query('SELECT id, code FROM iot_device_types');
 const T=Object.fromEntries(t.map(r=>[r.code,r.id]));
 const devs=[[1,2,T.climate_ctrl,'CLM-K1','Kontroler klimatu — Kurnik 1','online','bte/1/CLM-K1'],[1,3,T.climate_ctrl,'CLM-K2','Kontroler klimatu — Kurnik 2','online','bte/1/CLM-K2'],[1,2,T.temp_s,'TMP-K1-A','Czujnik temp. Kurnik 1 (przód)','online','bte/1/TMP-K1-A'],[1,2,T.temp_s,'TMP-K1-B','Czujnik temp. Kurnik 1 (tył)','warning','bte/1/TMP-K1-B'],[1,2,T.co2_s,'CO2-K1','Czujnik CO2 — Kurnik 1','online','bte/1/CO2-K1'],[1,2,T.nh3_s,'NH3-K1','Czujnik NH3 — Kurnik 1','online','bte/1/NH3-K1'],[1,null,T.silo_lvl,'SIL-1-LVL','Sonda poziomu — Silos 1','online','bte/1/SIL-1-LVL'],[1,null,T.silo_lvl,'SIL-2-LVL','Sonda poziomu — Silos 2','online','bte/1/SIL-2-LVL'],[1,2,T.bird_scale,'WGH-K1','Waga ptasia — Kurnik 1','online','bte/1/WGH-K1'],[1,3,T.water_m,'WTR-K2','Wodomierz — Kurnik 2','offline','bte/1/WTR-K2']];
 for(const [farmId,houseId,typeId,code,name,status,topic] of devs)
  await c.query('INSERT IGNORE INTO iot_devices (farmId,houseId,deviceTypeId,code,name,status,mqttTopic,lastSeenAt) VALUES (?,?,?,?,?,?,?,NOW())',[farmId,houseId,typeId,code,name,status,topic]);
 const [d]=await c.query('SELECT id, code FROM iot_devices');
 const code2id=Object.fromEntries(d.map(r=>[r.code,r.id]));
 const metrics={'TMP-K1-A':['temperature',21.5,0.9,'C'],'TMP-K1-B':['temperature',22.8,1.4,'C'],'CO2-K1':['co2',1850,320,'ppm'],'NH3-K1':['nh3',9.5,3.1,'ppm'],'SIL-1-LVL':['level_tons',34.0,0.4,'t'],'SIL-2-LVL':['level_tons',30.1,0.4,'t']};
 const now=Date.now();
 for(let m=0;m<96;m++){
  const ts=new Date(now-m*15*60*1000);
  for(const code of Object.keys(metrics)){
   const [metric,base,spread,unit]=metrics[code];
   const val=base+(Math.random()-0.5)*2*spread;
   const quality=(code==='TMP-K1-B'&&Math.random()<0.25)?'uncertain':'good';
   await c.query('INSERT INTO iot_telemetry (deviceId,ts,metric,rawValue,processedValue,unit,quality) VALUES (?,?,?,?,?,?,?)',[code2id[code],ts,metric,JSON.stringify({v:+val.toFixed(2)}),val.toFixed(4),unit,quality]);
  }
 }
 console.log('[preview] iot demo ready: devices='+d.length);
 await c.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
"

echo "[preview] starting dev server on 0.0.0.0:3000..."
exec npm run dev -- --host 0.0.0.0
