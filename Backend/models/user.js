import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,

    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    isBlocked: {
        type: Boolean,
        default: false, // Default to false, can be set to true if the user is blocked
    },
    location: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'agent', 'admin'], // Enum to restrict roles
       required:true, 
       default:"agent"// Required field for user role
     },
    skills: {
        type: [String], // Array of strings to hold multiple skills
        default: ["web"], // Default to an empty array
    },
    testPass:{
        type:String ,
        required: true, // Required field for test password

    },
    profilePicture: {
        type: String,
        required: true, // Optional field
        default: 'https://example.com/default-profile-picture.png', // Placeholder URL
    },
    verificationCode: {
        type: String,
        default: null, // Initially null, can be set to a verification code
    },
    isVerified: {
        type: Boolean,
        default: false, // Initially false, can be set to true upon verification
    },
    
}
,{
    timestamps: true, // Automatically manage createdAt and updatedAt fields
}
); 
 
const User = mongoose.model('User', userSchema);

export default User;