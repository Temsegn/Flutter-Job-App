exports.handleWebhook = async (req, res) => {
  try {
    console.log("Raw request body:", JSON.stringify(req.body)); // Log the parsed body

    const secret = process.env.CHAPA_SECRET_HASH;
    const signature = req.headers["x-chapa-signature"];
    console.log("Signature from Chapa:", signature);

    // Create the hash from the body and compare with the signature
    const hash = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body)) // Create the correct hash from the parsed body
      .digest("hex");

    console.log("Generated HMAC hash:", hash);

    // Verify the signature
    if (hash !== signature) {
      return res.status(403).json({ message: "Invalid webhook signature." });
    }

    // If the signature matches, process the event
    const event = req.body; // Parse the JSON if needed
    console.log("Webhook event received:", event);

    // Step 3: Process the event if it's a charge success
    if (event.event === "charge.success" && event.status === "success") {
      // Step 4: Update the payment record in your database
      const payment = await Payment.findOne({ tx_ref: event.tx_ref });
      if (payment) {
        payment.status = "Success";
        payment.chapaReference = event.reference;
        payment.updatedAt = Date.now(); // Update timestamp
        await payment.save();

        // Step 5: Find the associated order
        const order = await Order.findById(payment.orderId).populate(
          "items.menuItem"
        );
        if (order) {
          // Step 6: Mark the order as paid and update its payment information
          order.payment.isPaid = true;
          order.payment.method = "Online";
          order.payment.transactionId = event.reference;
          await order.save();
          //TODO
          if (order.orderType === "in-person") {
            // Tables;
            const table = await Tables.findById(order.table.tableNumber);
            console.log("table", table);
            table.isAvailable = true;
            await table.save();
            const io = getSocketIO();
            io.to(rooms.cachier).emit(SOCKET_EVENTS.PAYMENT_STATUS_UPDATE, {
              orderId: order._id,
            });
            io.to(rooms.waiter).emit(SOCKET_EVENTS.PAYMENT_STATUS_UPDATE, {
              orderId: order._id,
            });
          }
          // your logic
}
      }
    }

    // Respond with success
    res.status(200).json({ message: "Webhook processed successfully." });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ message: "Error occurred", error: error.message });
  }
};