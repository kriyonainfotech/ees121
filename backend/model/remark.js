// models/Remark.js
const mongoose = require("mongoose");

const RemarkSchema = new mongoose.Schema(
  {
    remark: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Remark", RemarkSchema);
