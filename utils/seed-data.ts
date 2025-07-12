import { hashPassword } from "./auth"

// Initialize default users with credentials
export const initializeDefaultUsers = async (): Promise<void> => {
  // Initialize default admin accounts
  const existingAdmins = JSON.parse(localStorage.getItem("gym-admins") || "[]")

  if (existingAdmins.length === 0) {
    const defaultAdmins = [
      {
        id: "admin-1",
        name: "System Administrator",
        email: "admin@corefactory.com",
        username: "admin",
        password: await hashPassword("Admin123!"),
        role: "admin",
        createdAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: "admin-2",
        name: "Gym Manager",
        email: "manager@corefactory.com",
        username: "manager",
        password: await hashPassword("Manager123!"),
        role: "admin",
        createdAt: new Date().toISOString(),
        isDefault: true,
      },
    ]

    localStorage.setItem("gym-admins", JSON.stringify(defaultAdmins))
    console.log("✅ Default admin accounts created")
  }

  // Initialize default member accounts
  const existingMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")

  if (existingMembers.length === 0) {
    const defaultMembers = [
      {
        id: "member-1",
        name: "John Doe",
        email: "john.doe@email.com",
        phone: "+1234567890",
        username: "johndoe",
        password: await hashPassword("Member123!"),
        role: "member",
        dateOfBirth: "1990-05-15",
        address: "123 Main St, City, State",
        emergencyContact: "Jane Doe - +1234567891",
        medicalConditions: "None",
        fitnessGoals: "Weight loss and muscle building",
        membershipType: "Premium",
        joinDate: "2024-01-15",
        status: "active",
        createdAt: new Date().toISOString(),
        isDefault: true,
        packages: [
          {
            id: "pkg-1",
            name: "Personal Training",
            type: "Personal Training",
            sessionsTotal: 10,
            sessionsUsed: 3,
            sessionsRemaining: 7,
            startDate: "2024-01-15",
            endDate: "2024-04-15",
            status: "active",
          },
        ],
      },
      {
        id: "member-2",
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1234567892",
        username: "sarahj",
        password: await hashPassword("Sarah123!"),
        role: "member",
        dateOfBirth: "1985-08-22",
        address: "456 Oak Ave, City, State",
        emergencyContact: "Mike Johnson - +1234567893",
        medicalConditions: "None",
        fitnessGoals: "Strength training and flexibility",
        membershipType: "Standard",
        joinDate: "2024-02-01",
        status: "active",
        createdAt: new Date().toISOString(),
        isDefault: true,
        packages: [
          {
            id: "pkg-2",
            name: "Group Classes",
            type: "Group Class",
            sessionsTotal: 20,
            sessionsUsed: 5,
            sessionsRemaining: 15,
            startDate: "2024-02-01",
            endDate: "2024-05-01",
            status: "active",
          },
        ],
      },
      {
        id: "member-3",
        name: "Mike Wilson",
        email: "mike.wilson@email.com",
        phone: "+1234567894",
        username: "mikew",
        password: await hashPassword("Mike123!"),
        role: "member",
        dateOfBirth: "1992-12-10",
        address: "789 Pine St, City, State",
        emergencyContact: "Lisa Wilson - +1234567895",
        medicalConditions: "Previous knee injury",
        fitnessGoals: "Cardio improvement and weight maintenance",
        membershipType: "Basic",
        joinDate: "2024-03-10",
        status: "active",
        createdAt: new Date().toISOString(),
        isDefault: true,
        packages: [
          {
            id: "pkg-3",
            name: "Gym Access",
            type: "Gym Access",
            sessionsTotal: 30,
            sessionsUsed: 8,
            sessionsRemaining: 22,
            startDate: "2024-03-10",
            endDate: "2024-06-10",
            status: "active",
          },
        ],
      },
    ]

    localStorage.setItem("gym-members", JSON.stringify(defaultMembers))
    console.log("✅ Default member accounts created")
  }
}

// Call this function to initialize default users
export const seedDefaultData = async (): Promise<void> => {
  try {
    await initializeDefaultUsers()
    console.log("✅ Default users initialized successfully!")
    console.log("\n🔐 LOGIN CREDENTIALS:")
    console.log("\n👨‍💼 ADMIN ACCOUNTS:")
    console.log("1. Username: admin | Password: Admin123!")
    console.log("2. Username: manager | Password: Manager123!")
    console.log("\n👤 MEMBER ACCOUNTS:")
    console.log("1. Username: johndoe | Password: Member123!")
    console.log("2. Username: sarahj | Password: Sarah123!")
    console.log("3. Username: mikew | Password: Mike123!")
  } catch (error) {
    console.error("❌ Error seeding default data:", error)
  }
}

// Force reset all data (for testing purposes)
export const resetAllData = async (): Promise<void> => {
  localStorage.removeItem("gym-admins")
  localStorage.removeItem("gym-members")
  localStorage.removeItem("current-user")
  await seedDefaultData()
  console.log("🔄 All data reset and reseeded!")
}
