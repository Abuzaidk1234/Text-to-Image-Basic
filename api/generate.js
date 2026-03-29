module.exports = async (_req, res) => {
  res.status(200).json({
    message: "The current PromptCanvas version talks directly to AI Horde from script.js.",
  });
};
