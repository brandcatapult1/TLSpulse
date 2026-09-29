// Local development seed. Idempotent: wipes app data and recreates a sample month.
// Temp passwords are written to seed-credentials.local.txt (gitignored), never committed.
import { PrismaClient, ShootType, ShootStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import { tempPassword } from "../src/lib/passwords";

const db = new PrismaClient();
const dbDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

async function main() {
  await db.auditLog.deleteMany();
  await db.shootAssignment.deleteMany();
  await db.shoot.deleteMany();
  await db.resource.deleteMany();
  await db.team.deleteMany();
  await db.brand.deleteMany();
  await db.user.deleteMany();

  const adminPw = tempPassword();
  const userPw = tempPassword();
  const admin = await db.user.create({
    data: { name: "Vaibhav", email: "vaibhav@tls.local", role: "ADMIN", passwordHash: await bcrypt.hash(adminPw, 10) },
  });
  const user = await db.user.create({
    data: { name: "Dhruv", email: "dhruv@tls.local", role: "USER", passwordHash: await bcrypt.hash(userPw, 10) },
  });
  const crewPw = tempPassword();

  // Internal/External is a property of the team; members inherit it.
  const teamDefs: [string, "INTERNAL" | "EXTERNAL", [string, string][]][] = [
    ["Photography", "INTERNAL", [["Rohit", "Photographer"], ["Karan", "Photographer"]]],
    ["Video", "INTERNAL", [["Rahul", "Videographer"]]],
    ["Production", "INTERNAL", [["Neha", "Producer"], ["Priya", "Producer"]]],
    ["Freelance Crew", "EXTERNAL", [["Aditya", "Photographer"], ["Aman", "Videographer"]]],
  ];
  const res: Record<string, string> = {};
  for (const [teamName, type, members] of teamDefs) {
    const team = await db.team.create({ data: { name: teamName, type } });
    for (const [name, role] of members) {
      const r = await db.resource.create({ data: { name, role, teamId: team.id } });
      res[name] = r.id;
      // Sample crew login: Rohit sees only his own shoots.
      if (name === "Rohit") {
        await db.user.create({ data: { name, email: "rohit@tls.local", role: "CREW", resourceId: r.id, passwordHash: await bcrypt.hash(crewPw, 10) } });
      }
    }
  }

  const brands: Record<string, string> = {};
  for (const [name, group] of [["Marriott", "Marriott International"], ["ITC Hotels", "ITC"], ["Nykaa", null], ["ABC", null]] as const) {
    brands[name] = (await db.brand.create({ data: { name, companyGroup: group } })).id;
  }

  // Sample month = current month (local time).
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const d = (day: number) => `${ym}-${String(day).padStart(2, "0")}`;
  const S = ShootType.SOCIAL_MEDIA, R = ShootType.REAL_TIME_VISIT;

  type Row = [number, string, ShootType, string | null, string | null, string | null, string[], ShootStatus?, string?];
  const rows: Row[] = [
    [2, "Marriott", S, "10:00", "14:00", "Aerocity, New Delhi", ["Rohit", "Aman", "Neha"]],
    [3, "ITC Hotels", R, null, null, "ITC Maurya", ["Karan"]],
    [5, "Nykaa", S, "11:00", "15:00", "Nykaa Studio, Gurugram", ["Rohit", "Rahul"]],
    [6, "ABC", S, null, null, null, []],
    [8, "Marriott", R, "09:00", "11:00", "JW Marriott, Aerocity", ["Aditya", "Priya"]],
    [9, "ITC Hotels", S, "13:00", "18:00", "ITC Sheraton", ["Karan", "Aman", "Neha"]],
    [11, "Nykaa", R, null, null, "Select Citywalk", ["Rohit"], ShootStatus.CANCELLED],
    [12, "ABC", S, "10:00", "13:00", "Hauz Khas", ["Aditya", "Rahul"]],
    [13, "Marriott", S, "16:00", "19:00", "Courtyard Gurugram", ["Karan", "Priya"]], // Sunday-ish weekend check
    [15, "ITC Hotels", R, "10:00", "12:00", "ITC Grand Bharat", ["Rohit", "Neha"]],
    [16, "Marriott", S, "10:00", "14:00", "Aerocity, New Delhi", ["Rohit", "Aman", "Neha"]],
    [16, "Nykaa", S, null, null, null, []],
    // busy day → "+N more"
    [18, "Marriott", S, "10:00", "14:00", "Aerocity, New Delhi", ["Rohit", "Aman", "Neha"], undefined, "Lifestyle campaign shoot."],
    [18, "ITC Hotels", R, "14:00", "16:00", "ITC Maurya", ["Rohit", "Karan"]], // Rohit double-booked, times don't overlap
    [18, "ABC", S, "18:00", "21:00", "Cyber Hub", ["Rahul", "Priya"]],
    [18, "Nykaa", R, null, null, null, ["Aditya"]],
    [18, "Marriott", R, "11:00", "12:00", "Sheraton Saket", ["Aditya"]], // Aditya also on the untimed Nykaa shoot → warning only
    [19, "ITC Hotels", R, null, null, "ITC Maratha", ["Aman"], ShootStatus.RESCHEDULED],
    [20, "ABC", S, "12:00", "16:00", "Lodhi Garden", ["Karan", "Rahul"]],
    [22, "Marriott", S, "10:00", "13:00", "Aerocity, New Delhi", ["Rohit", "Neha"]],
    [23, "Nykaa", S, "15:00", "19:00", "Nykaa Studio, Gurugram", ["Aditya", "Aman", "Priya"]],
    [24, "ITC Hotels", S, null, null, null, ["Karan"]],
    [25, "ABC", R, "09:30", "11:00", "Connaught Place", ["Rohit"]],
    [26, "Marriott", R, null, null, null, []],
    [27, "Nykaa", S, "11:00", "14:00", "Mehrauli", ["Rahul", "Neha"]],
    [28, "Marriott", R, "10:00", "12:00", "Aerocity, New Delhi", ["Aditya"]],
    [28, "ITC Hotels", S, "14:00", "18:00", "ITC Maurya", ["Karan", "Aman", "Priya"]],
    [29, "ABC", S, null, null, null, ["Rohit", "Rahul"]],
    [30, "Nykaa", R, "16:00", "17:00", "DLF Promenade", []],
  ];

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (const [day, brand, type, st, et, loc, people, status, notes] of rows) {
    if (day > lastDay) continue;
    const creator = day % 2 ? admin.id : user.id;
    await db.shoot.create({
      data: {
        brandId: brands[brand], shootType: type, date: dbDate(d(day)),
        startTime: st, endTime: et, location: loc, notes: notes ?? null,
        status: status ?? ShootStatus.PLANNED, createdById: creator, updatedById: creator,
        assignments: { create: people.map((p) => ({ resourceId: res[p], createdById: creator })) },
      },
    });
  }


  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  fs.writeFileSync(
    "seed-credentials.local.txt",
    `TLS Pulse — local logins (created ${new Date().toLocaleString("en-IN")})\n` +
      `Re-running the seed replaces these. You'll be asked to set your own password on first login.\n\n` +
      `Admin  vaibhav@tls.local  ${adminPw}\nUser   dhruv@tls.local    ${userPw}\nCrew   rohit@tls.local    ${crewPw}   (Rohit — crew logins are switched off for now)\n\nPublic calendar: ${appUrl}/bookings\n`,
  );
  console.log(`Seeded ${rows.length} shoots for ${ym}. Credentials → seed-credentials.local.txt`);
}

main().finally(() => db.$disconnect());
