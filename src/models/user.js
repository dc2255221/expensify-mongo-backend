const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const expense = require('./expense');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 7,
        trim: true,
        validate(value) {
            if (value.toLowerCase().includes("password")) {
                throw new Error('Password cannot contain password')
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        validate(value) {
            if (value < 0) {
                throw new Error('Age must be a positive number');
            }
        }
    },
    tokens: [{
        token: { 
            type: String,
            required: true
        }
    }]
}, {
    timestamps: true
})

userSchema.virtual('expenses', {
    ref: 'Expense',
    localField: '_id',
    foreignField: 'owner'
}) 

// Privatize the password and tokens array
userSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.tokens;
    return userObject;
}

// Generate auth token and add it to user's tokens array
userSchema.methods.generateAuthToken = async function () {
    console.log("generateAuthToken is called");
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, 'thisismysecret');
    user.tokens = user.tokens.concat({ token });
    await user.save();
    return token; 
}

// Find user with input email and then validate whether input password matches hashed password in db  
userSchema.statics.findByCredentials = async (email, password) => {
    console.log('findByCredentials is called');
    const user = await User.findOne({ email })
    if (!user) {
        throw new Error('Unable to login');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Unable to login');
    }
    return user;
}

// Hash the plain test password before saving
userSchema.pre('save', async function (next) {
    console.log("pre-save hash function is called");
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }
    next();
})

// Delete user expenses when user is removed
userSchema.pre('remove', async function (next) {
    const user = this;
    await expense.deleteMany({ owner: user._id });
    next();
})

const User = mongoose.model('User', userSchema);

module.exports = User;