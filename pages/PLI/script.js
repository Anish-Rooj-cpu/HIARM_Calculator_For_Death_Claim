const formatIN = new Intl.NumberFormat('en-IN');
let pliChartInstance = null;

function calculateAgeFromDOB() {
    const dobStr = document.getElementById('pli-dob').value;
    if (!dobStr) return;
    const dob = new Date(dobStr);
    const today = new Date();
    
    // Age they turn THIS calendar year
    let age = today.getFullYear() - dob.getFullYear();
    
    const m = today.getMonth() - dob.getMonth();
    const isBirthdayPassed = m > 0 || (m === 0 && today.getDate() >= dob.getDate());
    
    // If their birthday has already passed this year, their next birthday will be next year (age + 1)
    // If their birthday hasn't passed yet, their next birthday is this year (age)
    if (isBirthdayPassed) {
        age++;
    }

    if (age >= 0) {
        document.getElementById('pli-age').value = age;
    }
}

function calculatePLI() {
    const name = document.getElementById('pli-name').value.trim();
    const age = parseInt(document.getElementById('pli-age').value);
    const sa = parseFloat(document.getElementById('pli-sa').value);
    const bonusRate = parseFloat(document.getElementById('pli-bonus-rate').value);
    const spouseAge = parseInt(document.getElementById('pli-spouse-age').value);

    if (isNaN(age) || age < 19 || age > 55) {
        alert("Please enter a valid current age (between 19 and 55).");
        return;
    }

    if (isNaN(sa) || sa < 20000 || sa > 5000000) {
        alert("Please enter a valid Sum Assured (between ₹20,000 and ₹5,000,000).");
        return;
    }

    if (isNaN(bonusRate) || bonusRate < 0) {
        alert("Please enter a valid Bonus Rate.");
        return;
    }

    // Standard maturity ages for Endowment Assurance (Santosh)
    const maturityAges = [35, 40, 45, 50, 55, 58, 60];
    const tbody = document.getElementById('pli-table-body');
    tbody.innerHTML = '';

    let optionsGenerated = false;
    let lastTotalBonus = 0;
    let lastMatAgeValid = 0;

    // GST is now zero for PLI
    const gstRate = 0.00; 

    const frequency = document.getElementById('pli-frequency').value;
    let multiplier = 1;
    let frequencyText = "Monthly";
    if (frequency === "Half-Yearly") { multiplier = 6; frequencyText = "Half-Yearly"; }
    else if (frequency === "Yearly") { multiplier = 12; frequencyText = "Yearly"; }

    // Rebate of ₹1 per ₹20,000 Sum Assured per month
    const monthlyRebate = Math.floor(sa / 20000) * 1; 
    const periodRebate = monthlyRebate * multiplier;

    function getEARate(dur, entryAge) {
        // Flat baseline curve for all entry ages 19 to 46
        const baselineRates = [
            { d: 5, r: 17.40 }, // Extrapolated safely
            { d: 6, r: 14.40 },
            { d: 9, r: 9.60 },
            { d: 11, r: 7.60 },
            { d: 12, r: 7.20 },
            { d: 14, r: 6.20 },
            { d: 15, r: 5.40 },
            { d: 16, r: 5.20 },
            { d: 20, r: 4.00 },
            { d: 21, r: 3.80 },
            { d: 25, r: 3.20 },
            { d: 26, r: 3.00 },
            { d: 30, r: 2.60 },
            { d: 31, r: 2.60 }
        ];

        // Elevated mortality curve for age 49 (and extrapolated for higher ages)
        const olderAgeRates = [
            { d: 5, r: 17.60 },
            { d: 6, r: 14.60 },
            { d: 9, r: 9.80 },
            { d: 11, r: 8.00 },
            { d: 12, r: 7.60 },
            { d: 14, r: 6.60 },
            { d: 15, r: 5.80 },
            { d: 16, r: 5.60 },
            { d: 20, r: 4.40 },
            { d: 21, r: 4.20 },
            { d: 25, r: 3.60 },
            { d: 26, r: 3.40 },
            { d: 30, r: 3.00 },
            { d: 31, r: 3.00 }
        ];

        function interpolate1D(d, rates) {
            const exact = rates.find(x => x.d === d);
            if (exact) return exact.r;
            if (d <= rates[0].d) return rates[0].r + (d - rates[0].d) * ((rates[1].r - rates[0].r) / (rates[1].d - rates[0].d));
            if (d >= rates[rates.length-1].d) return rates[rates.length-1].r + (d - rates[rates.length-1].d) * ((rates[rates.length-1].r - rates[rates.length-2].r) / (rates[rates.length-1].d - rates[rates.length-2].d));
            for (let i = 0; i < rates.length - 1; i++) {
                if (d > rates[i].d && d < rates[i+1].d) {
                    const ratio = (d - rates[i].d) / (rates[i+1].d - rates[i].d);
                    return rates[i].r + ratio * (rates[i+1].r - rates[i].r);
                }
            }
        }

        // Interpolate along duration for both anchor curves
        const baseRate = interpolate1D(dur, baselineRates);
        const oldRate = interpolate1D(dur, olderAgeRates);
        
        // 2D Interpolate across entry ages
        // The baseline applies flatly for all ages up to 46.
        let ageRatio = 0;
        if (entryAge > 46) {
            ageRatio = (entryAge - 46) / (49 - 46);
        }
        
        let finalRate = baseRate + ageRatio * (oldRate - baseRate);
        
        return finalRate;
    }

    maturityAges.forEach(matAge => {
        const duration = matAge - age;

        // Minimum duration for EA is usually 5 years
        if (duration >= 5) {
            optionsGenerated = true;

            // Retrieve accurate official base rate via linear interpolation
            let baseMonthlyPremiumPerThousand = getEARate(duration, age); 
            let grossMonthlyPremium = (sa / 1000) * baseMonthlyPremiumPerThousand;
            let grossPeriodPremium = grossMonthlyPremium * multiplier;
            
            // Apply rebate
            let netPeriodPremium = grossPeriodPremium - periodRebate;
            if (netPeriodPremium < 0) netPeriodPremium = 0;

            // Calculate Tax
            let periodTax = 0;
            let finalPeriodPremium = Math.round(netPeriodPremium + periodTax);

            // Calculate Total Bonus
            let totalBonus = (sa / 1000) * bonusRate * duration;
            
            // Maturity Amount
            let maturityAmount = sa + totalBonus;
            
            lastTotalBonus = totalBonus;
            lastMatAgeValid = matAge;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">${matAge}</td>
                <td style="text-align: center;">${duration}</td>
                <td style="text-align: center;">${Math.round(grossPeriodPremium)}</td>
                <td style="text-align: center;">${periodRebate}</td>
                <td style="text-align: center;">0</td>
                <td style="text-align: center;">${finalPeriodPremium}</td>
                <td style="text-align: center;">${totalBonus}</td>
                <td style="text-align: center;">${maturityAmount}</td>
            `;
            tbody.appendChild(tr);
        }
    });

    if (!optionsGenerated) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No valid maturity options available for this age.</td></tr>`;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB').replace(/\//g, ' - ');
    document.getElementById('out-effective-date').textContent = formattedDate;
    document.getElementById('out-pli-age').textContent = age;
    document.getElementById('out-pli-sa').textContent = sa; // No formatting to match sample
    document.getElementById('out-pli-bonus').textContent = bonusRate;
    document.getElementById('out-pli-bonus-pa').textContent = (sa / 1000) * bonusRate;
    document.getElementById('out-report-title').textContent = `Endowment Assurance - ${frequencyText} Premium`;
    document.getElementById('out-spouse-age').textContent = isNaN(spouseAge) ? '0' : spouseAge;

    if (optionsGenerated) {
        if (pliChartInstance) {
            pliChartInstance.destroy();
        }
        const ctx = document.getElementById('pliChart').getContext('2d');
        pliChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Sum Assured', 'Total Bonus (Est.)'],
                datasets: [{
                    data: [sa, lastTotalBonus],
                    backgroundColor: ['#079992', '#e55039'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 14 } }
                    },
                    title: {
                        display: true,
                        text: `Maturity Projection (Age ${lastMatAgeValid})`,
                        font: { size: 16 }
                    }
                }
            }
        });
        document.getElementById('chart-container-section').style.display = 'flex';
    } else {
        document.getElementById('chart-container-section').style.display = 'none';
    }

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
        document.body.style.width = '1000px';

        const originalWidth = reportNode.style.width;
        const originalMaxWidth = reportNode.style.maxWidth;
        const originalPadding = reportNode.style.padding;
        
        reportNode.style.width = '1000px';
        reportNode.style.maxWidth = 'none';
        reportNode.style.padding = '40px'; 

        html2canvas(reportNode, {
            scale: 2, 
            backgroundColor: "#ffffff",
            windowWidth: 1000,
            scrollY: 0,
            useCORS: true 
        }).then(canvas => {
            document.body.style.width = originalBodyWidth;
            reportNode.style.width = originalWidth;
            reportNode.style.maxWidth = originalMaxWidth;
            reportNode.style.padding = originalPadding;
            
            const nameInput = document.getElementById('pli-name').value.trim();
            const safeName = nameInput ? nameInput.replace(/[^a-zA-Z0-9]/g, '_') : 'PLI_Estimate';
            const fileName = `PLI_${safeName}.png`;

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
        const captureWidth = 1100;

        html2canvas(reportNode, {
            scale: 3,
            backgroundColor: '#ffffff',
            windowWidth: captureWidth,
            scrollY: 0,
            useCORS: true,
            onclone: function(clonedDoc) {
                const clonedBody = clonedDoc.body;
                const clonedReport = clonedDoc.getElementById('report-container');
                clonedBody.style.width = captureWidth + 'px';
                clonedReport.style.width = captureWidth + 'px';
                clonedReport.style.maxWidth = 'none';
                clonedReport.style.padding = '0px 10px 30px 10px'; // Removed top padding
                clonedReport.style.fontSize = '15px';
            }
        }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4'); // Switch back to portrait
            const pageW = 210;
            const pageH = 297;

            const canvasAspect = canvas.height / canvas.width;
            let imgW = pageW;
            let imgH = imgW * canvasAspect;

            if (imgH > pageH) {
                imgH = pageH;
                imgW = imgH / canvasAspect;
            }

            const xOffset = (pageW - imgW) / 2;
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            pdf.addImage(imgData, 'JPEG', xOffset, 0, imgW, imgH); // Removed top margin

            const nameInput = document.getElementById('pli-name').value.trim();
            const safeName = nameInput ? nameInput.replace(/[^a-zA-Z0-9]/g, '_') : 'PLI_Estimate';
            pdf.save(`PLI_${safeName}.pdf`);

            btn.innerHTML = originalText;
            btn.disabled = false;
        }).catch(err => {
            console.error('PDF generation error:', err);
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }, 100);
}
