import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxpHfJ7mWx2LFuv6E5xrboiiK8oEJDIRbQ0kpdtGmucxGDJlS8Ynv730p6Tm8-p87Z9/exec";

async function runMigration() {
  console.log("Fetching Google Sheets data...");
  const response = await fetch(SCRIPT_URL);
  if (!response.ok) {
    throw new Error(`Google Sheets responded with ${response.status}`);
  }
  const rawData = await response.json();
  const rawExpenses = rawData.expenses || [];
  const rawIncomes = rawData.incomes || [];

  console.log(`Fetched ${rawExpenses.length} expenses and ${rawIncomes.length} incomes.`);

  // Write expenses in batches of 400
  let batch = writeBatch(db);
  let opCount = 0;
  let expCount = 0;

  for (const row of rawExpenses) {
    const vals = row.values || [];
    const acc = vals[9] ? String(vals[9]).trim() : '';
    const rawLift = vals[4] != null ? String(vals[4]).trim() : '';
    const cleanExpense = {
      rowId: Number(row.rowId) || (Date.now() + expCount),
      date: vals[0] ? String(vals[0]).split('T')[0] : '',
      invoice: vals[1] != null ? String(vals[1]).trim() : '',
      category: vals[2] != null ? String(vals[2]).trim() : '',
      subCategory: vals[3] != null ? String(vals[3]).trim() : '',
      liftNo: rawLift,
      owner: vals[5] != null ? String(vals[5]).trim() : '',
      location: vals[6] != null ? String(vals[6]).trim() : '',
      description: vals[7] != null ? String(vals[7]).trim() : '',
      amount: parseFloat(vals[8]) || 0,
      account: (acc === 'Bank' || acc === 'Cash') ? acc : 'Cash',
      isAdvance: false,
      advancePerson: '',
      advanceStatus: 'Pending',
      updatedAt: new Date().toISOString()
    };

    const newDocRef = doc(collection(db, 'expenses'));
    batch.set(newDocRef, cleanExpense);
    opCount++;
    expCount++;

    if (opCount >= 400) {
      console.log(`Committing batch of ${opCount} operations...`);
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  let incCount = 0;
  for (const row of rawIncomes) {
    const vals = row.values || [];
    const acc = vals[9] ? String(vals[9]).trim() : '';
    const rawLift = vals[2] != null ? String(vals[2]).trim() : '';
    const total = parseFloat(vals[5]) || 0;
    const paid = parseFloat(vals[6]) || 0;
    const due = parseFloat(vals[7]) || 0;

    const cleanIncome = {
      rowId: Number(row.rowId) || (Date.now() + incCount),
      date: vals[0] ? String(vals[0]).split('T')[0] : '',
      source: vals[1] != null ? String(vals[1]).trim() : '',
      liftNo: rawLift,
      owner: vals[3] != null ? String(vals[3]).trim() : '',
      location: vals[4] != null ? String(vals[4]).trim() : '',
      totalAmt: total,
      discountAmt: 0,
      netAmt: total,
      paidAmt: paid,
      dueAmt: due,
      description: vals[8] != null ? String(vals[8]).trim() : '',
      account: (acc === 'Bank' || acc === 'Cash') ? acc : 'Cash',
      updatedAt: new Date().toISOString()
    };

    const newDocRef = doc(collection(db, 'incomes'));
    batch.set(newDocRef, cleanIncome);
    opCount++;
    incCount++;

    if (opCount >= 400) {
      console.log(`Committing batch of ${opCount} operations...`);
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  if (opCount > 0) {
    console.log(`Committing final batch of ${opCount} operations...`);
    await batch.commit();
  }

  console.log(`Successfully migrated ${expCount} expenses and ${incCount} incomes!`);
  process.exit(0);
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
