// src/app.ts
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import { ENV } from "./env";
import { errorHandler } from "./middlewares/error";
import { authRouter } from "./routes/auth.routes";
import { productRouter } from "./routes/products.routes";
import { policyRouter } from "./routes/policies.routes";
import { claimRouter } from "./routes/claims.routes";
import { credentialRouter } from "./routes/credential.routes";
import externalRouter from "./routes/external.routes";

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload()); // 10MB

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/products", productRouter);
app.use("/policies", policyRouter);
app.use("/claims", claimRouter);
app.use("/api/credentials", credentialRouter);
app.use("/ext", externalRouter); // 프론트는 /ext/*만 부르면 됨

app.use(errorHandler);

app.listen(ENV.PORT, () => {
  console.log(`[API] listening on http://localhost:${ENV.PORT}`);
});
