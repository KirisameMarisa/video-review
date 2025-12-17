import fs from "fs";
import path from "path";
import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
    const filePath = path.join("prisma/schemas/openapi.json");
    const prismaSpec = JSON.parse(fs.readFileSync(filePath, "utf8")) as any;

    const spec = createSwaggerSpec({
        apiFolder: "src/app/api",
        definition: {
            openapi: "3.0.0",
            info: {
                title: "VideoReview API",
                version: "1.0",
            },
            components: {
                schemas: {
                    ...prismaSpec.components.schemas,

                    ApiErrorResponse: {
                        type: "object",
                        properties: {
                            error: {
                                type: "string",
                            },
                        },
                        required: ["error"],
                    },
                },
            },
        },
        schemaFolders: ["prisma/schemas"],
    });
    return spec;
};
