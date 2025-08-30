#!/bin/bash

# Live sample monitoring
echo "🔬 LIVE PATERNITY SAMPLE TRACKING"
echo "══════════════════════════════════════"
echo "Samples progress every 10 seconds automatically"
echo "Press Ctrl+C to stop watching"
echo ""

while true; do
    clear
    echo "🔬 PATERNITY TESTING WORKFLOW - $(date '+%H:%M:%S')"
    echo "══════════════════════════════════════"
    echo ""
    echo "📊 Current Sample Distribution (50 samples total):"
    echo ""
    
    sqlite3 /Users/user/JAG-LABSCIENTIFIC-DNA/backend/database/ashley_lims.db <<EOF | column -t -s '|'
SELECT 
    CASE workflow_status
        WHEN 'sample_collected' THEN '1. 📦 Collection'
        WHEN 'pcr_ready' THEN '2. 🧪 PCR Ready'
        WHEN 'pcr_batched' THEN '3. 🔬 PCR Batched'
        WHEN 'pcr_completed' THEN '4. ✅ PCR Done'
        WHEN 'electro_ready' THEN '5. ⚡ Electro Ready'
        WHEN 'electro_batched' THEN '6. 🔋 Electro Batched'
        WHEN 'electro_completed' THEN '7. ✨ Electro Done'
        WHEN 'analysis_ready' THEN '8. 📊 Analysis Ready'
        WHEN 'analysis_completed' THEN '9. 📈 Analysis Done'
        WHEN 'report_ready' THEN '10. 📝 Report Ready'
        WHEN 'report_sent' THEN '11. ✉️ Report Sent'
    END as stage,
    COUNT(*) as samples
FROM samples 
GROUP BY workflow_status 
ORDER BY 
    CASE workflow_status
        WHEN 'sample_collected' THEN 1
        WHEN 'pcr_ready' THEN 2
        WHEN 'pcr_batched' THEN 3
        WHEN 'pcr_completed' THEN 4
        WHEN 'electro_ready' THEN 5
        WHEN 'electro_batched' THEN 6
        WHEN 'electro_completed' THEN 7
        WHEN 'analysis_ready' THEN 8
        WHEN 'analysis_completed' THEN 9
        WHEN 'report_ready' THEN 10
        WHEN 'report_sent' THEN 11
    END;
EOF
    
    echo ""
    echo "🔄 Samples automatically progress to next stage every 10 seconds"
    echo "⏱️  Refreshing in 5 seconds..."
    
    sleep 5
done