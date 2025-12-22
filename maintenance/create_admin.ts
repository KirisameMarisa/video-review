import readline from "readline-sync";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`);
    if (index !== -1 && index + 1 < process.argv.length) {
        return process.argv[index + 1];
    }
    return undefined;
}

let email = getArg("email");
let password = getArg("pass");

const exists = await prisma.user.findUnique({ where: { email } });
if (exists) {
    console.log("Admin already exists. Skip.");
    process.exit(0);
}

if (!email) {
    email = readline.question("Admin email: ");
}

if (!password) {
    password = readline.question("Password: ", { hideEchoBack: true });
}

if (!email || !password) {
    console.error("email and password are required");
    process.exit(1);
}

const hash = await bcrypt.hash(password, 10);

await prisma.user.create({
    data: {
        email,
        displayName: "admin",
        role: "admin",
        identities: {
            create: {
                provider: "password",
                providerUid: email,
                secretHash: hash,
            },
        },
    },
});

console.log("Admin account created.");
await prisma.$disconnect();
