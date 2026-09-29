@echo off
cd /d "C:\Users\Bi3tina\Documents\GitHub\quepasa-lebanon"
npx tsx scripts\run-reminders-send.ts >> scripts\reminders-log.txt 2>&1
