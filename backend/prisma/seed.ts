import { PrismaClient, Role, VisitorType, ResidentType, ResidentStatus, PropertyStatus, DispatchStatus, VisitorStatus, PassStatus, AccessAction, AccessStatus, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO = true;

async function main() {
  console.log("=== SEED: SILVERLAND ZONE — DEMO DATA (marked DEMO) ===");

  // 1. Estate settings singleton
  await prisma.estateSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      estateName: "Silverland Zone",
      estateSubtitle: "Tedo Housing Estate",
      visitorPassValidityHours: 24,
      dispatchValidityMinutes: 45,
      maxVisitorDurationHours: 12,
      residentsMustApproveVisitors: true,
      dispatchRequiresResidentConfirmation: true,
      securityOfficerCanEditResidents: false,
      securityOfficerCanOverrideDenied: false,
      allowUnexpectedVisitors: true,
    },
  });

  // 2. Auth users
  const hash = (p: string) => bcrypt.hashSync(p, 10);

  const users = [
    { email: "superadmin@silverland.ng", password: "SuperAdmin@123", name: "System Administrator", role: Role.SUPER_ADMIN, phone: "+2348000000001" },
    { email: "management@silverland.ng", password: "Estate@123", name: "Estate Manager", role: Role.ESTATE_MANAGEMENT, phone: "+2348000000002" },
    { email: "officer.ade@silverland.ng", password: "Officer@123", name: "Officer Ade", role: Role.SECURITY_OFFICER, phone: "+2348000000011" },
    { email: "officer.bello@silverland.ng", password: "Officer@123", name: "Officer Bello", role: Role.SECURITY_OFFICER, phone: "+2348000000012" },
    { email: "officer.chidi@silverland.ng", password: "Officer@123", name: "Officer Chidi", role: Role.SECURITY_OFFICER, phone: "+2348000000013" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, phone: u.phone, role: u.role, passwordHash: (u.role === Role.SECURITY_OFFICER ? hash : hash)(u.password), isActive: true },
      create: { email: u.email, name: u.name, phone: u.phone, role: u.role, passwordHash: hash(u.password), isActive: true },
    });
  }

  const officerAde = await prisma.user.findUnique({ where: { email: "officer.ade@silverland.ng" } });
  const officerBello = await prisma.user.findUnique({ where: { email: "officer.bello@silverland.ng" } });
  const officerChidi = await prisma.user.findUnique({ where: { email: "officer.chidi@silverland.ng" } });

  // Security officers
  const officers = [
    { userId: officerAde?.id, badgeNumber: "SLV-PL-001", station: "Main Gate (Plateau)", name: "Officer Ade" },
    { userId: officerBello?.id, badgeNumber: "SLV-PL-002", station: "Main Gate (Plateau)", name: "Officer Bello" },
    { userId: officerChidi?.id, badgeNumber: "SLV-PL-003", station: "Service Gate", name: "Officer Chidi" },
  ];
  for (const o of officers) {
    if (!o.userId) continue;
    await prisma.securityOfficer.upsert({
      where: { badgeNumber: o.badgeNumber },
      update: { userId: o.userId, station: o.station, name: o.name },
      create: o,
    });
  }

  // 3. Properties
  const properties = [
    { unitNumber: "B1", block: "Block B", propertyType: "Maisonette" },
    { unitNumber: "B2", block: "Block B", propertyType: "Maisonette" },
    { unitNumber: "B3", block: "Block B", propertyType: "Apartment" },
    { unitNumber: "C5", block: "Block C", propertyType: "Apartment" },
    { unitNumber: "C6", block: "Block C", propertyType: "Apartment" },
    { unitNumber: "D2", block: "Block D", propertyType: "Duplex" },
    { unitNumber: "D3", block: "Block D", propertyType: "Duplex" },
    { unitNumber: "A1", block: "Block A", propertyType: "Apartment" },
    { unitNumber: "A2", block: "Block A", propertyType: "Apartment" },
    { unitNumber: "E7", block: "Block E", propertyType: "Apartment" },
  ];
  for (const p of properties) {
    await prisma.property.upsert({
      where: { unitNumber: p.unitNumber },
      update: {},
      create: { ...p, status: PropertyStatus.ACTIVE },
    });
  }
  const allProps = await prisma.property.findMany();

  // 4. Residents (10) with demo names
  const residentsData = [
    { firstName: "Adewale", lastName: "Adebayo", phone: "+2348011000001", email: "adewale@example.com", unit: "B1", type: ResidentType.OWNER },
    { firstName: "Ngozi", lastName: "Okafor", phone: "+2348011000002", email: "ngozi@example.com", unit: "B2", type: ResidentType.OWNER },
    { firstName: "Ibrahim", lastName: "Musa", phone: "+2348011000003", email: "ibrahim@example.com", unit: "B3", type: ResidentType.TENANT },
    { firstName: "Funke", lastName: "Alade", phone: "+2348011000004", email: "funke@example.com", unit: "C5", type: ResidentType.TENANT },
    { firstName: "Chinedu", lastName: "Eze", phone: "+2348011000005", email: "chinedu@example.com", unit: "C6", type: ResidentType.OWNER },
    { firstName: "Bola", lastName: "Akin", phone: "+2348011000006", email: "bola@example.com", unit: "D2", type: ResidentType.LANDLORD },
    { firstName: "Fatima", lastName: "Yusuf", phone: "+2348011000007", email: "fatima@example.com", unit: "D3", type: ResidentType.TENANT },
    { firstName: "Tunde", lastName: "Balogun", phone: "+2348011000008", email: "tunde@example.com", unit: "A1", type: ResidentType.OWNER },
    { firstName: "Grace", lastName: "Nwosu", phone: "+2348011000009", email: "grace@example.com", unit: "A2", type: ResidentType.OWNER },
    { firstName: "Kelechi", lastName: "Uche", phone: "+2348011000010", email: "kelechi@example.com", unit: "E7", type: ResidentType.TENANT },
  ];

  const createdResidents: any[] = [];
  for (let i = 0; i < residentsData.length; i++) {
    const rd = residentsData[i];
    const prop = allProps.find((p) => p.unitNumber === rd.unit);
    const email = i === 0 ? "resident@silverland.ng" : `resident${i + 1}@silverland.ng`;
    const password = i === 0 ? "Resident@123" : "Resident@123";

    // link first resident to a portal user
    let userForResident: string | null = null;
    if (i === 0) {
      const rUser = await prisma.user.upsert({
        where: { email },
        update: { name: `${rd.firstName} ${rd.lastName}`, passwordHash: hash(password), isActive: true },
        create: { email, name: `${rd.firstName} ${rd.lastName}`, passwordHash: hash(password), role: Role.RESIDENT, isActive: true },
      });
      userForResident = rUser.id;
    }

    let resident =
      userForResident
        ? await prisma.resident.findUnique({ where: { userId: userForResident } })
        : null;
    if (!resident) {
      resident = await prisma.resident.findFirst({ where: { phone: rd.phone } });
    }
    if (!resident) {
      resident = await prisma.resident.create({
        data: {
          firstName: rd.firstName,
          lastName: rd.lastName,
          phone: rd.phone,
          email: rd.email,
          residentType: rd.type,
          propertyStatus: ResidentStatus.ACTIVE,
          propertyId: prop?.id ?? null,
          userId: userForResident,
          source: "MANUAL",
          verified: true,
          notes: "DEMO DATA — sample resident record",
        },
      });
    }
    createdResidents.push(resident);
  }

  // 5. Vehicles for some residents
  const vehicles = [
    { plateNumber: "ABC-123-XZ", residentIndex: 0, make: "Toyota", color: "Silver", type: "SUV" },
    { plateNumber: "SUV-962-GY", residentIndex: 2, make: "Mercedes", color: "Black", type: "Sedan" },
    { plateNumber: "KJA-777-XQ", residentIndex: 4, make: "Honda", color: "Blue", type: "Sedan" },
  ];
  for (const v of vehicles) {
    const res = createdResidents[v.residentIndex];
    if (!res) continue;
    const existing = await prisma.vehicle.findFirst({ where: { plateNumber: v.plateNumber } });
    if (existing) continue;
    await prisma.vehicle.create({
      data: {
        residentId: res.id,
        plateNumber: v.plateNumber,
        make: v.make,
        color: v.color,
        type: v.type,
        notes: "DEMO DATA",
      },
    });
  }

  // 6. Visitors (5) with passes — dates spread across TODAY so the dashboard
  //    always shows "expected today" / activity for the current day.
  //    Clean out any previous demo records for idempotent re-seeding.
  await prisma.accessLog.deleteMany({ where: { notes: { contains: "DEMO DATA" } } });
  await prisma.visitorPass.deleteMany({ where: { OR: [{ token: { startsWith: "DEMOTOKEN" } }, { token: { startsWith: "DISPATCH" } }] } });
  await prisma.visitor.deleteMany({ where: { notes: null } });
  await prisma.dispatchRider.deleteMany({ where: { passToken: { startsWith: "DISPATCH" } } });

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const nextDay = new Date(now); nextDay.setDate(nextDay.getDate() + 1); nextDay.setHours(0, 0, 0, 0);
  const visitorsSpec = [
    { firstName: "David", lastName: "Michael", phone: "+2348013000001", type: VisitorType.GUEST, purpose: "Family visit", hours: 4, status: VisitorStatus.EXPECTED },
    { firstName: "Sara", lastName: "Cyril", phone: "+2348013000002", type: VisitorType.SERVICE, purpose: "AC servicing", hours: 3, status: VisitorStatus.APPROVED },
    { firstName: "Emeka", lastName: "Osondu", phone: "+2348013000003", type: VisitorType.CONTRACTOR, purpose: "Plumbing repair", hours: 5, status: VisitorStatus.APPROVED },
    { firstName: "Blessing", lastName: "Ade", phone: "+2348013000004", type: VisitorType.FAMILY, purpose: "Birthday celebration", hours: 6, status: VisitorStatus.APPROVED },
    { firstName: "Mr. Tunde", lastName: "Bankole", phone: "+2348013000005", type: VisitorType.GUEST, purpose: "Business meeting", hours: 2, status: VisitorStatus.APPROVED },
  ];

  const createdVisitors: any[] = [];
  for (let i = 0; i < visitorsSpec.length; i++) {
    const vs = visitorsSpec[i];
    const res = createdResidents[i % createdResidents.length];
    const resident = res;
    // Arrival between ~09:00 and ~17:00 today, always within today.
    const arrival = new Date(todayStart.getTime() + 9 * 3600 * 1000 + i * 2 * 3600 * 1000);
    const departure = new Date(arrival.getTime() + vs.hours * 3600 * 1000);
    const visitor = await prisma.visitor.create({
      data: {
        residentId: resident?.id ?? null,
        fullName: `${vs.firstName} ${vs.lastName}`,
        phone: vs.phone,
        visitorType: vs.type,
        purpose: vs.purpose,
        expectedDate: arrival,
        expectedArrival: arrival,
        expectedDeparture: departure,
        status: vs.status,
        registeredById: createdResidents[0] ? (await prisma.user.findFirst({ where: { role: Role.RESIDENT } }))?.id ?? null : null,
      },
    });

    const token = `DEMOTOKEN${String(i + 1).padStart(4, "0")}${(i + 1) * 111}`;
    const expiresAt = new Date(arrival.getTime() + 24 * 3600 * 1000);
    await prisma.visitorPass.create({
      data: {
        visitorId: visitor.id,
        token,
        qrContent: `SILVERLAND:${token}`,
        status: i === 0 ? PassStatus.ACTIVE : i === 4 ? PassStatus.EXPIRED : PassStatus.ACTIVE,
        expiresAt,
        maxUses: 1,
        usesCount: i === 2 ? 1 : 0,
      },
    });
    createdVisitors.push(visitor);
  }

  // 7. Dispatch riders (5)
  const ridersSpec = [
    { name: "John Doe", company: "XYZ Logistics", orderRef: "XYZ-12345", bike: "KJA-101-QQ", residentIndex: 0, purpose: "Food delivery" },
    { name: "Musa Baba", company: "FoodDash", orderRef: "FD-77321", bike: "ABC-545-MM", residentIndex: 1, purpose: "Food delivery" },
    { name: "Kalu Oke", company: "GIG Logistics", orderRef: "GIG-99887", bike: "KLD-208-ZZ", residentIndex: 2, purpose: "Package delivery" },
    { name: "Ifeoma Obi", company: "Jumia Express", orderRef: "JX-55410", bike: "PLS-123-AB", residentIndex: 3, purpose: "Shopping delivery" },
    { name: "Tunde Riss", company: "Bolt Delivery", orderRef: "BLT-33345", bike: "SSY-890-CN", residentIndex: 4, purpose: "Medicine delivery" },
  ];
  for (const r of ridersSpec) {
    const res = createdResidents[r.residentIndex];
    if (!res) continue;
    const token = `DISPATCH${r.orderRef.replace(/[^A-Za-z0-9]/g, "")}`;
    const unit = res.propertyId
      ? (await prisma.property.findUnique({ where: { id: res.propertyId } }))?.unitNumber ?? null
      : null;
    await prisma.dispatchRider.create({
      data: {
        residentId: res.id,
        riderName: r.name,
        company: r.company,
        orderReference: r.orderRef,
        deliveryUnit: unit,
        bikeNumber: r.bike,
        plateNumber: r.bike,
        status: DispatchStatus.APPROVED,
        passToken: token + "Z",
        expiresAt: new Date(now.getTime() + 45 * 60 * 1000),
        notes: r.purpose,
      },
    });
  }

  // 8. Access logs — mix of entry/exit for visitors & riders
  const accessLogs = [
    { personType: "VISITOR", visitorIndex: 0, action: AccessAction.ENTRY, status: AccessStatus.INSIDE, minutesAgo: 80 },
    { personType: "VISITOR", visitorIndex: 1, action: AccessAction.ENTRY, status: AccessStatus.INSIDE, minutesAgo: 45 },
    { personType: "VISITOR", visitorIndex: 2, action: AccessAction.ENTRY, status: AccessStatus.EXITED, minutesAgo: 300, exitMinutesAgo: 60 },
    { personType: "DISPATCH", riderIndex: 0, action: AccessAction.ENTRY, status: AccessStatus.INSIDE, minutesAgo: 20 },
  ];

  const officerId = officerAde?.id
    ? (await prisma.securityOfficer.findFirst({ where: { userId: officerAde.id } }))?.id
    : null;

  for (const a of accessLogs) {
    const nowRef = new Date(Date.now() - a.minutesAgo * 60000);
    const entry = nowRef;
    const exitAt = a.exitMinutesAgo ? new Date(Date.now() - a.exitMinutesAgo * 60000) : null;
    const duration = a.exitMinutesAgo ? Math.round((entry.getTime() - exitAt.getTime()) / 1000) : null;
    if (a.personType === "VISITOR") {
      const vis = createdVisitors[a.visitorIndex];
      if (!vis) continue;
      await prisma.accessLog.create({
        data: {
          personType: "VISITOR",
          visitorId: vis.id,
          residentId: vis.residentId,
          action: a.action,
          status: a.status,
          securityOfficerId: officerId,
          entryAt: entry,
          exitAt,
          durationSeconds: duration,
          vehiclePlate: null,
          source: "SCAN",
          notes: "DEMO DATA",
        },
      });
    } else {
      const rider = await prisma.dispatchRider.findFirst({ where: { orderReference: ["XYZ-12345", "FD-77321", "GIG-99887", "JX-55410", "BLT-33345"][a.riderIndex] } });
      if (!rider) continue;
      await prisma.accessLog.create({
        data: {
          personType: "DISPATCH",
          dispatchId: rider.id,
          residentId: rider.residentId,
          action: a.action,
          status: a.status,
          securityOfficerId: officerId,
          entryAt: entry,
          exitAt,
          durationSeconds: duration,
          vehiclePlate: rider.bikeNumber,
          source: "SCAN",
          notes: "DEMO DATA",
        },
      });
    }
  }

  // 9. Notifications + audit sample
  const mgmtUser = await prisma.user.findUnique({ where: { email: "management@silverland.ng" } });
  const residentUser = await prisma.user.findUnique({ where: { email: "resident@silverland.ng" } });
  if (mgmtUser && residentUser) {
    await prisma.notification.createMany({
      data: [
        { userId: residentUser.id, type: NotificationType.VISITOR_ARRIVAL, title: "Your guest has arrived", message: "David Michael arrived at the Main Gate at " + new Date().toLocaleTimeString(), actorName: "Officer Ade", link: "/resident/visitors" },
        { userId: mgmtUser.id, type: NotificationType.SECURITY_ALERT, title: "Denied access attempt", message: "An expired pass was presented at the gate.", actorName: "Officer Bello", link: "/access-logs" },
      ],
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "SEED",
      actorName: "System",
      entityType: "System",
      summary: "Demo data seeded across all modules (marked DEMO).",
    },
  });

  console.log("DONE. Demo accounts:");
  console.log("  Super Admin:      superadmin@silverland.ng / SuperAdmin@123");
  console.log("  Estate Mgmt:      management@silverland.ng / Estate@123");
  console.log("  Security Officer: officer.ade@silverland.ng / Officer@123");
  console.log("  Resident:         resident@silverland.ng / Resident@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
