function timViTriCot(headerRow) {
  const ketQua = {};
  for (let c = 0; c < headerRow.length; c++) {
    const ten = String(headerRow[c]).trim().toLowerCase();
    if (ten === "uid") ketQua.uid = c;
    if (ten === "ho_ten") ketQua.hoten = c;
    if (ten === "lop") ketQua.lop = c;
    if (ten === "mssv") ketQua.mssv = c;
    if (ten === "thoi_gian") ketQua.thoigian = c;
  }
  return ketQua;
}

function timDongTieuDe(data) {
  for (let i = 0; i < data.length; i++) {
    for (let c = 0; c < data[i].length; c++) {
      if (String(data[i][c]).trim().toLowerCase() === "uid") {
        return i;
      }
    }
  }
  return -1;
}

// Tim o co chua chuoi "nhan" (khong phan biet hoa/thuong), tra ve {hang, cot} hoac null
function timOTheoNhan(sheet, nhan) {
  const data = sheet.getDataRange().getValues();
  const nhanLower = nhan.toLowerCase();
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      if (String(data[r][c]).trim().toLowerCase().indexOf(nhanLower) >= 0) {
        return { hang: r, cot: c };
      }
    }
  }
  return null;
}

function laCungNgay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function capNhatThongKe(svSheet, logSheet) {
  const svData = svSheet.getDataRange().getValues();
  const dongTieuDeSV = timDongTieuDe(svData);
  if (dongTieuDeSV < 0) return;

  const cotSV = timViTriCot(svData[dongTieuDeSV]);
  const danhSachUid = [];

  for (let i = dongTieuDeSV + 1; i < svData.length; i++) {
    const uidHang = String(svData[i][cotSV.uid]).trim().toUpperCase();
    if (uidHang !== "") danhSachUid.push(uidHang);
  }

  const tongSinhVien = danhSachUid.length;

  // Ghi tong sinh vien vao o ngay duoi tieu de "Tong sinh vien" (tu tim, khong phu thuoc vi tri)
  const oTongSV = timOTheoNhan(svSheet, "tổng sinh viên") || timOTheoNhan(svSheet, "tong sinh vien");
  if (oTongSV) {
    svSheet.getRange(oTongSV.hang + 2, oTongSV.cot + 1).setValue(tongSinhVien);
  }

  // Tinh diem danh TRONG NGAY HOM NAY
  const logData = logSheet.getDataRange().getValues();
  const dongTieuDeLog = timDongTieuDe(logData);
  const cotLog = dongTieuDeLog >= 0 ? timViTriCot(logData[dongTieuDeLog]) : null;

  const homNay = new Date();
  const daDiemDanhHomNay = new Set();

  if (dongTieuDeLog >= 0 && cotLog && cotLog.thoigian !== undefined) {
    for (let i = dongTieuDeLog + 1; i < logData.length; i++) {
      const uidLog = String(logData[i][cotLog.uid]).trim().toUpperCase();
      const hotenLog = cotLog.hoten !== undefined ? logData[i][cotLog.hoten] : "";
      const thoiGianLog = logData[i][cotLog.thoigian];

      if (uidLog !== "" && hotenLog && danhSachUid.indexOf(uidLog) >= 0 &&
          thoiGianLog instanceof Date && laCungNgay(thoiGianLog, homNay)) {
        daDiemDanhHomNay.add(uidLog);
      }
    }
  }

  const soDaDiemDanh = daDiemDanhHomNay.size;
  const phanTram = tongSinhVien > 0 ? Math.round((soDaDiemDanh / tongSinhVien) * 100) : 0;
  const noiDungKetQua = soDaDiemDanh + "/" + tongSinhVien + " (" + phanTram + "%)";

  // Ghi vao o duoi tieu de co chua "diem danh" o sheet DiemDanh (tu tim, uu tien tieu de khac "uid/ho_ten/thoi_gian")
  let oPhanTram = timOTheoNhan(logSheet, "tỷ lệ") || timOTheoNhan(logSheet, "ty le") ||
                  timOTheoNhan(logSheet, "phần trăm") || timOTheoNhan(logSheet, "phan tram");

  if (!oPhanTram) {
    // Chua co tieu de nao, tu tao o cot trong dau tien tren dong tieu de (uid/ho_ten/thoi_gian)
    if (dongTieuDeLog >= 0) {
      const hangTieuDe = logData[dongTieuDeLog];
      let cotTrong = hangTieuDe.length;
      for (let c = 0; c < hangTieuDe.length; c++) {
        if (String(hangTieuDe[c]).trim() === "") { cotTrong = c; break; }
      }
      logSheet.getRange(dongTieuDeLog + 1, cotTrong + 1).setValue("Ty le diem danh hom nay");
      oPhanTram = { hang: dongTieuDeLog, cot: cotTrong };
    }
  }

  if (oPhanTram) {
    logSheet.getRange(oPhanTram.hang + 2, oPhanTram.cot + 1).setValue(noiDungKetQua);
  }
}

function doGet(e) {
  Logger.log("PHIEN BAN MOI - " + new Date());
  const uid = (e.parameter.uid || "").trim().toUpperCase();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const svSheet = ss.getSheetByName("SinhVien");
  const logSheet = ss.getSheetByName("DiemDanh");

  const data = svSheet.getDataRange().getValues();
  const dongTieuDe = timDongTieuDe(data);

  let found = null;

  if (dongTieuDe >= 0) {
    const cot = timViTriCot(data[dongTieuDe]);

    for (let i = dongTieuDe + 1; i < data.length; i++) {
      const rowUid = String(data[i][cot.uid]).trim().toUpperCase();
      if (rowUid === uid && rowUid !== "") {
        found = {
          hoten: cot.hoten !== undefined ? data[i][cot.hoten] : "",
          lop: cot.lop !== undefined ? data[i][cot.lop] : "",
          mssv: cot.mssv !== undefined ? data[i][cot.mssv] : ""
        };
        break;
      }
    }
  }

  const now = new Date();
  let result;
  const logData0 = logSheet.getDataRange().getValues();
  const dongTieuDeLog0 = timDongTieuDe(logData0);
  const cotLog0 = dongTieuDeLog0 >= 0 ? timViTriCot(logData0[dongTieuDeLog0]) : { uid: 0, hoten: 1, thoigian: 2 };
  const nextRow = logSheet.getLastRow() + 1;
  const uidText = "'" + uid;

  if (found) {
    logSheet.getRange(nextRow, cotLog0.uid + 1).setValue(uidText);
    logSheet.getRange(nextRow, cotLog0.hoten + 1).setValue(found.hoten);
    logSheet.getRange(nextRow, cotLog0.thoigian + 1).setValue(now);
    result = {
      status: "ok",
      hoten: found.hoten,
      lop: found.lop,
      mssv: found.mssv
    };
  } else {
    logSheet.getRange(nextRow, cotLog0.uid + 1).setValue(uidText);
    logSheet.getRange(nextRow, cotLog0.thoigian + 1).setValue(now);
    result = { status: "notfound" };
  }

  capNhatThongKe(svSheet, logSheet);

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}