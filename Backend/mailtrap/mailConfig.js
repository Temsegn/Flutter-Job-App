// utils/mailConfig.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

export const sender = {
  address: "hello@example.com", // Replace with your verified sender email
  name: "Auth App",
};
