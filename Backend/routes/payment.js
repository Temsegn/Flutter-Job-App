exports.initializePayment = async (req, res) => {
  try {
    const {
      orderId,
      email,
      firstName,
      lastName,
      phoneNumber,
      amount,
      callbackUrl,
      returnUrl,
      tx_ref,
    } = req.body;

    // Validate required fields
    if (
      !orderId 
      // !email 
      // !phoneNumber 
      // !firstName 
      // !lastName 
      !amount 
      !tx_ref
      // !callbackUrl ||
      // !returnUrl
    ) {
      console.log("initialize transaction");
      console.log(orderId, amount, tx_ref);
      // console.log(req.body);
      // return res.status(400).json({ message: "All fields are required." });
      throw new Error("fields are required.");
    }

    // Generate transaction reference
    // const tx_ref = order-${orderId}-${Date.now()};

    // Create payment record
    const newPayment = new Payment({
      orderId,
      tx_ref,
      amount,
      status: "Pending",
    });

    // Prepare request payload for Chapa

    const chapaPayload = {
      amount,
      currency: "ETB",
      email,
      phone_number: phoneNumber,
      first_name: firstName,
      last_name: lastName,
      // todo recreate tx_ref for each request
      tx_ref,
      callback_url: callbackUrl,
      return_url: returnUrl,
    };
    console.log("chapaPayload bbbbbbbbbbbbb", chapaPayload);
    console.log("chapaPayload CHAPA_SECRET_KEY", process.env.CHAPA_SECRET_KEY);

    // Call Chapa API to initialize the payment
    
    const response = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      chapaPayload,
      {
        headers: {
          Authorization: Bearer ${process.env.CHAPA_SECRET_KEY},
          "Content-Type": "application/json",
        },
      }
    );

    // Handle API response
    if (response.data.status === "success") {
      let existingPayment = await Payment.findOne({ orderId });

      let newTxRef = tx_ref;
      existingPayment.tx_ref = newTxRef;
      //save updating tx_ref
      await existingPayment.save();
      // await newPayment.save();
      return { checkoutUrl: response.data.data.checkout_url }; // Return checkout URL
    } else {
      console.log(response.data.message);
      throw new Error("Failed to initialize payment.");
    }
  } catch (error) {
    console.error(error);
    throw error; // Rethrow the error to be caught in the calling controller
  }
};