@echo off
cd /d "C:\Users\Bi3tina\Documents\GitHub\quepasa"
npx tsx scripts\run-ticketmaster-ingest.ts >> scripts\ingest-log.txt 2>&1
