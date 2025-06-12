import User from '../models/user.js'

export const getUsers=async(req,res)=>{
    // Fetch all users from the database
    const users = await User.find().select('-password -verificationCode'); // Exclude sensitive fields like password and verificationCode
    try {
         res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
}

export const getUserById=async (req, res) => {
    const { id } = req.params;

    try {
        // Find user by ID and exclude sensitive fields
        const user = await User.findById(id).select('-password');
        
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
}

export const deleteUserById=async (req, res) => {
    const { id } = req.params;

    try {
        // Find user by ID and delete
 
       const user= await User.findByIdAndDelete(id).select('-password -verificationCode');
       if(!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
       if (user.isAdmin || user.isAgent) {
            return res.status(403).json({ msg: 'Cannot delete admin or agent user' });
        }
        res.status(200).json({ msg: 'User deleted successfully' });
      }
       catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
}
export const updateUserById = async (req, res) => {
    const { id } = req.params;
    
    // Destructure fields to exclude them from being updated
    const { email, password,...allowedUpdates } = req.body;

    try {
        // Update only allowed fields
        const user = await User.findByIdAndUpdate(
            id,
            allowedUpdates,
            { new: true, runValidators: true }
        ).select('-password -verificationCode');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

export const registerUser = async (req, res) => {
    try {
        const { username, email, password, location, role, ...rest } = req.body;
        if (!username || !email || !password || !location|| !role) {
            return res.status(400).json({ msg: 'Please provide all required fields' });
        }
        // Use default role if not provided
        const user = new User({ username, email, password, location, role:req.body.role || 'user'});
        await user.save();
        res.status(201).json({ msg: 'User registered successfully', user: { username, email, location, role: user.role } });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
}

