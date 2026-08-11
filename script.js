const formatIN = new Intl.NumberFormat('en-IN');

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
}

function formatManualDateStr(dateStr) {
    if (!dateStr) return 'Date Not Provided';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr;
}

function addDaysToDate(dateObj, days) {
    let result = new Date(dateObj.valueOf());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

function dateDiffInDays(startObj, endObj) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((endObj.getTime() - startObj.getTime()) / msPerDay);
}

function toggleManualOverride() {
    const isManual = document.getElementById('check-override').checked;
    document.getElementById('manual-paid-container').style.display = isManual ? 'block' : 'none';
    document.getElementById('auto-note').style.display = isManual ? 'none' : 'block';
}

function addManualEntry() {
    const container = document.getElementById('manual-entries-list');
    const row = document.createElement('div');
    row.className = 'manual-entry-row';
    row.innerHTML = `
        <input type="date" class="manual-date" style="flex: 1;">
        <input type="number" class="manual-amount" placeholder="Amount (₹)" style="flex: 1;">
        <button type="button" class="btn-small btn-remove" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(row);
}

function calculateHIARM() {
    const name = document.getElementById('in-name').value;
    const acc = document.getElementById('in-acc').value;
    const principal = parseFloat(document.getElementById('in-principal').value);
    const scssRate = parseFloat(document.getElementById('in-scss-rate').value);
    const posaRate = parseFloat(document.getElementById('in-posa-rate').value);
    
    const openStr = document.getElementById('in-open-date').value;
    const deathStr = document.getElementById('in-death-date').value;
    const closureStr = document.getElementById('in-closure-date').value;

    const openDate = new Date(openStr + 'T00:00:00Z');
    const deathDate = new Date(deathStr + 'T00:00:00Z');
    const closureDate = new Date(closureStr + 'T00:00:00Z');
    
    const maturityDate = new Date(openDate.valueOf());
    maturityDate.setUTCFullYear(maturityDate.getUTCFullYear() + 5);

    const deathMonth = deathDate.getUTCMonth(); 
    let startMonth = 0;
    if (deathMonth >= 0 && deathMonth <= 2) startMonth = 0; 
    else if (deathMonth >= 3 && deathMonth <= 5) startMonth = 3; 
    else if (deathMonth >= 6 && deathMonth <= 8) startMonth = 6; 
    else if (deathMonth >= 9 && deathMonth <= 11) startMonth = 9; 
    
    let startDate = new Date(Date.UTC(deathDate.getUTCFullYear(), startMonth, 1));
    
    if (startDate < openDate) {
        startDate = new Date(openDate.valueOf());
    }
    
    let systemPaid = 0;
    let payouts = [];

    if (document.getElementById('check-override').checked) {
        document.getElementById('out-auto-note').textContent = "Interest credited based on manual verification.";
        
        const entryRows = document.querySelectorAll('.manual-entry-row');
        entryRows.forEach(row => {
            const dateVal = row.querySelector('.manual-date').value;
            const amountVal = parseFloat(row.querySelector('.manual-amount').value) || 0;
            
            if (amountVal > 0) {
                systemPaid += amountVal;
                payouts.push({ desc: `Manual Payment Credited (${formatManualDateStr(dateVal)})`, amount: amountVal });
            }
        });

        if (payouts.length === 0) {
            payouts.push({ desc: "No manual payments entered", amount: 0 });
        }

    } else {
        document.getElementById('out-auto-note').textContent = "Interest credited by system based on account remaining active.";
        const quarterlyInterest = Math.round((principal * scssRate) / 400); 
        const monthlyInterest = ((principal * scssRate) / 400) / 3;

        let tempDate = new Date(startDate.valueOf());

        while (true) {
            let nextQ = new Date(tempDate.valueOf());
            nextQ.setUTCMonth(nextQ.getUTCMonth() + 3);

            if (nextQ <= maturityDate) {
                if (nextQ <= closureDate) {
                    systemPaid += quarterlyInterest;
                    payouts.push({ desc: `Automated Full Quarter Payout (${formatDate(nextQ)})`, amount: quarterlyInterest });
                    tempDate = new Date(nextQ.valueOf());
                } else {
                    break; 
                }
            } else {
                if (maturityDate <= closureDate) {
                    let brokenAmount = 0;
                    let iterDate = new Date(tempDate.valueOf());

                    while (true) {
                        let nextMonth = new Date(iterDate.valueOf());
                        nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

                        if (nextMonth <= maturityDate) {
                            brokenAmount += monthlyInterest;
                            iterDate = new Date(nextMonth.valueOf());
                        } else {
                            let year = iterDate.getUTCFullYear();
                            let month = iterDate.getUTCMonth() + 1; 
                            let daysInMonth = new Date(year, month, 0).getDate();
                            
                            let remainingDays = maturityDate.getUTCDate() - iterDate.getUTCDate();
                            
                            if(remainingDays > 0) {
                                brokenAmount += monthlyInterest * (remainingDays / daysInMonth);
                            }
                            break;
                        }
                    }
                    let roundedBroken = Math.round(brokenAmount);
                    if (roundedBroken > 0) {
                        systemPaid += roundedBroken;
                        payouts.push({ desc: `Final Broken-Period Interest at Maturity (${formatDate(maturityDate)})`, amount: roundedBroken });
                    }
                }
                break;
            }
        }
    }
    
    const scssDays = dateDiffInDays(startDate, deathDate) + 1;
    const scssAmount = Math.round((principal * scssRate * scssDays) / 36500);
    
    let posaCutoffDate = (maturityDate < closureDate) ? maturityDate : closureDate;
    let posaEndDate = addDaysToDate(posaCutoffDate, -1);
    let posaStartDate = addDaysToDate(deathDate, 1);
    
    let posaDays = 0;
    let posaAmount = 0;
    
    if (posaStartDate <= posaEndDate) {
        posaDays = dateDiffInDays(posaStartDate, posaEndDate) + 1;
        posaAmount = Math.round((principal * posaRate * posaDays) / 36500);
        document.getElementById('row-posa').style.display = 'table-row';
    } else {
        document.getElementById('row-posa').style.display = 'none'; 
    }

    const totalEntitlement = scssAmount + posaAmount;
    const recoveryAmount = systemPaid - totalEntitlement;
    
    // --- Post Maturity Interest (PMI) Logic ---
    let pmiDays = 0;
    let pmiAmount = 0;
    
    if (closureDate > maturityDate) {
        pmiDays = dateDiffInDays(maturityDate, closureDate); 
        pmiAmount = Math.round((principal * posaRate * pmiDays) / 36500);
        
        const pmiEndDate = addDaysToDate(closureDate, -1);
        const pmiPeriodStr = `${formatDate(maturityDate)} to ${formatDate(pmiEndDate)} (${pmiDays} Days)`;
        
        document.getElementById('row-pmi').style.display = 'table-row';
        document.getElementById('out-pmi-period').textContent = pmiPeriodStr;
        document.getElementById('out-pmi-amount').textContent = formatIN.format(pmiAmount);
    } else {
        document.getElementById('row-pmi').style.display = 'none';
    }

    const finalSettlement = principal + totalEntitlement + pmiAmount - systemPaid;
    const netInterestAdj = totalEntitlement - systemPaid;
    const netInterestAdjStr = netInterestAdj < 0 ? `- ₹${formatIN.format(Math.abs(netInterestAdj))}` : `₹${formatIN.format(netInterestAdj)}`;

    document.getElementById('out-name').textContent = name;
    document.getElementById('out-acc').textContent = acc;
    document.getElementById('out-principal').textContent = formatIN.format(principal);
    document.getElementById('out-death-date').textContent = formatDate(deathDate);
    document.getElementById('out-maturity-date').textContent = formatDate(maturityDate);
    document.getElementById('out-closure-date').textContent = formatDate(closureDate);
    
    const tbody = document.getElementById('payout-table-body');
    tbody.innerHTML = '';
    if (payouts.length === 0) {
        tbody.innerHTML = `<tr><td>No automated payments triggered</td><td class="amount-col">₹0</td></tr>`;
    } else {
        payouts.forEach(p => {
            tbody.innerHTML += `<tr><td>${p.desc}</td><td class="amount-col">₹${formatIN.format(p.amount)}</td></tr>`;
        });
    }

    document.getElementById('out-system-paid').textContent = formatIN.format(systemPaid);
    document.getElementById('out-system-paid-2').textContent = formatIN.format(systemPaid);
    
    document.getElementById('out-scss-period').textContent = `${formatDate(startDate)} to ${formatDate(deathDate)}`;
    document.getElementById('out-scss-days').textContent = scssDays;
    document.getElementById('out-scss-amount').textContent = formatIN.format(scssAmount);
    
    if(posaDays > 0) {
        document.getElementById('out-posa-period').textContent = `${formatDate(posaStartDate)} to ${formatDate(posaEndDate)}`;
        document.getElementById('out-posa-days').textContent = posaDays;
        document.getElementById('out-posa-amount').textContent = formatIN.format(posaAmount);
    }
    
    document.getElementById('out-total-entitlement').textContent = formatIN.format(totalEntitlement);
    document.getElementById('out-total-entitlement-2').textContent = formatIN.format(totalEntitlement);
    
    document.getElementById('out-recovery-amount').textContent = formatIN.format(recoveryAmount);

    document.getElementById('out-final-principal').textContent = formatIN.format(principal);
    document.getElementById('out-final-entitlement').textContent = formatIN.format(totalEntitlement);
    document.getElementById('out-final-system-paid').textContent = formatIN.format(systemPaid);
    document.getElementById('out-net-interest-adj').textContent = netInterestAdjStr;
    document.getElementById('out-final-settlement').textContent = formatIN.format(finalSettlement);

    document.getElementById('report-wrapper').style.display = 'block';
    document.getElementById('action-buttons').style.display = 'flex';
}

function downloadImage() {
    const btn = document.getElementById('btn-download');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Generating Image...';
    btn.disabled = true;

    setTimeout(() => {
        const reportNode = document.getElementById('report-container');
        
        const originalBodyWidth = document.body.style.width;
        document.body.style.width = '850px';

        const originalWidth = reportNode.style.width;
        const originalMaxWidth = reportNode.style.maxWidth;
        const originalPadding = reportNode.style.padding;
        
        reportNode.style.width = '850px';
        reportNode.style.maxWidth = 'none';
        reportNode.style.padding = '40px'; 

        html2canvas(reportNode, {
            scale: 2, 
            backgroundColor: "#ffffff",
            windowWidth: 850,
            scrollY: 0,
            useCORS: true 
        }).then(canvas => {
            document.body.style.width = originalBodyWidth;
            reportNode.style.width = originalWidth;
            reportNode.style.maxWidth = originalMaxWidth;
            reportNode.style.padding = originalPadding;
            
            const nameInput = document.getElementById('in-name').value.trim();
            const safeName = nameInput ? nameInput.replace(/[^a-zA-Z0-9]/g, '_') : 'Account_Holder';
            const fileName = `HIARM_${safeName}.png`;

            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            btn.innerHTML = originalText;
            btn.disabled = false;
        }).catch(err => {
            console.error(err);
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }, 50);
}

function downloadPDF() {
    const btn = document.getElementById('btn-download-pdf');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Generating PDF...';
    btn.disabled = true;

    setTimeout(() => {
        const reportNode = document.getElementById('report-container');

        // Save original styles
        const origBodyWidth = document.body.style.width;
        const origWidth = reportNode.style.width;
        const origMaxWidth = reportNode.style.maxWidth;
        const origPadding = reportNode.style.padding;

        // Force a fixed desktop width so mobile doesn't clip anything
        const captureWidth = 900;
        document.body.style.width = captureWidth + 'px';
        reportNode.style.width = captureWidth + 'px';
        reportNode.style.maxWidth = 'none';
        reportNode.style.padding = '30px';

        html2canvas(reportNode, {
            scale: 2,
            backgroundColor: '#ffffff',
            windowWidth: captureWidth,
            scrollY: 0,
            useCORS: true
        }).then(canvas => {
            // Restore original styles immediately
            document.body.style.width = origBodyWidth;
            reportNode.style.width = origWidth;
            reportNode.style.maxWidth = origMaxWidth;
            reportNode.style.padding = origPadding;

            const { jsPDF } = window.jspdf;

            // A4 dimensions in mm: 210 x 297
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageW = 210;
            const pageH = 297;

            // Zero margins — fill the entire page
            const canvasAspect = canvas.height / canvas.width;
            let imgW = pageW;
            let imgH = imgW * canvasAspect;

            // If it's taller than one page, scale down to fit
            if (imgH > pageH) {
                imgH = pageH;
                imgW = imgH / canvasAspect;
            }

            // Center horizontally if scaled down due to height
            const xOffset = (pageW - imgW) / 2;

            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            pdf.addImage(imgData, 'JPEG', xOffset, 0, imgW, imgH);

            // Generate filename from depositor name
            const nameInput = document.getElementById('in-name').value.trim();
            const safeName = nameInput ? nameInput.replace(/[^a-zA-Z0-9]/g, '_') : 'Account_Holder';
            pdf.save(`HIARM_${safeName}.pdf`);

            btn.innerHTML = originalText;
            btn.disabled = false;
        }).catch(err => {
            console.error('PDF generation error:', err);
            document.body.style.width = origBodyWidth;
            reportNode.style.width = origWidth;
            reportNode.style.maxWidth = origMaxWidth;
            reportNode.style.padding = origPadding;
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }, 100);
}
