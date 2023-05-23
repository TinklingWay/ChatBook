// SpreadsheetDBクラス
// Googleスプレッドシートを操作するためのクラス
class SpreadsheetDB {
  // コンストラクタ
  // スプレッドシートのIDを引数にとり、そのスプレッドシートを開く
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActive();
  }

  // getColumnIndexメソッド
  // シート名と列名を引数にとり、該当の列のインデックスを取得する
  // ヒットしない場合は -1 が返る
  getColumnIndex(sheetName, columnName) {
    // シートのヘッダ行を取得
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // key と一致するヘッダーの位置を探し、見つからない場合は -1 をセット
    const index = headers.indexOf(columnName);
    const colIndex = index >= 0 ? index + 1 : -1;

    return colIndex;
  }

  // selectメソッド
  // シート名、IDの列名、IDを引数にとり、該当の行のデータを取得する
  select(sheetName, idColumnName, id) {
    const idColumn = this.getColumnIndex(sheetName, idColumnName);
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    for (let row = 2; row <= lastRow; row++) {
      if (sheet.getRange(row, idColumn).getValue() === id) {
        const col = sheet.getLastColumn();
        return sheet.getRange(row, 1, 1, col).getValues()[0];
      }
    }
    return null;
  }

  // insertメソッド
  // シート名と追加するデータを引数にとり、新しい行にデータを追加する
  insert(sheetName, values) {
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    sheet.appendRow(values);
  }

  // updateメソッド
  // シート名、IDの列名、ID、更新する列名、更新する値を引数にとり、該当の行のデータを更新する
  update(sheetName, idColumnName, id, columnName, value) {
    const idColumn = this.getColumnIndex(sheetName, idColumnName);
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    for (let row = 2; row <= lastRow; row++) {
      if (sheet.getRange(row, idColumn).getValue() === id) {
        const column = this.getColumnIndex(sheetName, columnName);
        if (column !== 0) {
          sheet.getRange(row, column).setValue(value);
        } else {
          Logger.log('Invalid column name');
        }
        break;
      }
    }
  }

  // deleteメソッド
  // シート名、IDの列名、IDを引数にとり、該当の行を削除する
  delete(sheetName, idColumnName, id) {
    const idColumn = this.getColumnIndex(sheetName, idColumnName);
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    for (let row = 2; row <= lastRow; row++) {
      if (sheet.getRange(row, idColumn).getValue() === id) {
        sheet.deleteRow(row);
        break;
      }
    }
  }
}