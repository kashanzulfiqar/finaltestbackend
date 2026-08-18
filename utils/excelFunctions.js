const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

let methods = {

  excelToJson: (file) => {
    const filePath = file[0].filepath;
    const fileBuffer = fs.readFileSync(filePath);
    
    // Use xlsx to parse the file
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON format
    //const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
    return xlsx.utils.sheet_to_json(sheet, { defval: null });
  },

  jsonToExcel: (data, outputFilePath) => {
    // Create a new workbook
    const workbook = xlsx.utils.book_new();

    // Convert JSON data to a worksheet
    const worksheet = xlsx.utils.json_to_sheet(data);

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Define the output file path
    const outputPath = path.resolve(outputFilePath);

    // Write the workbook to the file
    xlsx.writeFile(workbook, outputPath);

    console.log(`Excel file created at: ${outputPath}`);
  },

  deleteExcelFile: (filePath) => {
  
    if (fs.existsSync(filePath)) {
      try {
        // Delete the file
        fs.unlinkSync(filePath);
        console.log(`File deleted: ${filePath}`);
      } catch (err) {
        console.error(`Error deleting file: ${err}`);
      }
    } else {
      console.log(`File not found: ${filePath}`);
    }
  },
};

module.exports = methods;
