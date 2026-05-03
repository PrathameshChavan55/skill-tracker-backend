import mongoose from "mongoose";

const learningLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title must not exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [1000, "Description must not exceed 1000 characters"],
    },
    topic: {
      type: String,
      required: [true, "Topic is required"],
      lowercase: true,
      trim: true,
    },
    confidenceScore: {
      type: Number,
      required: [true, "Confidence score is required"],
      min: [1, "Confidence score must be between 1 and 5"],
      max: [5, "Confidence score must be between 1 and 5"],
      validate: {
        validator: Number.isInteger,
        message: "confidenceScore must be an integer",
      },
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    loggedOn: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

const LearningLog = mongoose.model("LearningLog", learningLogSchema);

export default LearningLog;
