# HIARM Calculator for Death Claim (SCSS Account)

A lightweight, purely client-side web application designed to automatically calculate the **HIARM (Higher Interest Amount Recovery Mechanism)** recovery amount for Senior Citizen Savings Scheme (SCSS) accounts in the event of a depositor's death claim.

## 🚀 Features

- **Automated Interest Calculation**: Automatically determines the exact SCSS quarters paid and calculates the required recovery of excess interest paid after the date of death.
- **POSA Admissibility**: Automatically grants Savings Account (POSA) interest from the date of death to the date of maturity or closure.
- **Manual Override Support**: Allows the user to bypass the system's automated quarterly calculation to manually enter specific payout dates and amounts for absolute precision.
- **Dynamic Post-Maturity Interest (PMI)**: Calculates PMI automatically if the account closure date surpasses the 5-year maturity period.
- **High-Quality Export**: 
  - 📄 **Export as PDF**: Generates a high-quality, seamlessly bounded, single-page PDF that dynamically scales to perfectly fit the report size. Includes built-in JPEG compression (80% quality) to ensure lightweight, shareable files.
  - 🖼️ **Export as Image**: Downloads a lossless PNG of the generated report.
  - 🏷️ **Dynamic Filenames**: Automatically uses the Depositor's Name in the downloaded filename (e.g., `HIARM_SATYABAN_BANERJEE.pdf`).
- **Print-Ready Design**: Features an official layout with the India Post logo and a dedicated Postmaster (SPM) signature block.

## 🛠️ Technologies Used

- **HTML5 & Vanilla CSS3**: For structure, styling, and robust mobile-responsiveness.
- **Vanilla JavaScript (ES6)**: For all client-side calculations and dynamic DOM updates.
- **[html2canvas](https://html2canvas.hertzen.com/)**: To capture a high-resolution snapshot of the generated HTML report.
- **[jsPDF](https://raw.githack.com/MrRio/jsPDF/master/docs/jsPDF.html)**: To seamlessly embed the captured image into an exact-fit PDF document.

## 🌐 Live Access

You can use the calculator instantly without downloading anything. The app is securely hosted via GitHub Pages:
👉 **[Access the Live HIARM Calculator Here](https://Anish-Rooj-cpu.github.io/HIARM_Calculator_For_Death_Claim/)**

## ⚙️ How to Use (Local Setup)

Since this application is entirely client-side, no server, framework, or build process is required!

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Anish-Rooj-cpu/HIARM_Calculator_For_Death_Claim.git
   ```
2. **Navigate into the directory:**
   ```bash
   cd HIARM_Calculator_For_Death_Claim
   ```
3. **Open `index.html`** directly in any modern web browser. 

## 📝 Usage Instructions

1. Fill in the depositor details (Name, Account Number, Principal).
2. Input the exact Dates (Opening, Death, and Closure).
3. Ensure the current SCSS and POSA interest rates are accurate.
4. Click **Generate Report**. 
5. Review the calculated amounts, including Valid Entitlements and Excess Payments.
6. Click **Download as PDF** or **Download as Image** to save the generated report for physical signing by the SPM.

## 📄 License
This project is open-source and intended to assist postal assistants and accountants in accurately calculating HIARM recoveries.
