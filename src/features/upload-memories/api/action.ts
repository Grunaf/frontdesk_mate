"use server";

import { supabase } from "@/lib/db/client";

interface UploadParams {
  files: File[];
  instagramAccount?: string;
  filesLength: number;
}

function validateServerData(filesLength: number, instagram: string) {
    if (filesLength === 0) {
        throw new Error("No files provided");
    }

    const cleanInstagram = instagram.trim().replace("@", "");
    return { cleanInstagram };
}
function chooseFilePath(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    
    const folder = isVideo ? "videos" : isImage ? "image" : "others";
    // почему нужен знак доллара
    return `${folder}/${fileName}`
}
export async function uploadMemoriesAction(formData: FormData) {
    try {
        const files = formData.getAll("files") as File[];
        const instagram = formData.get("instagram") as string || "";
        // нужно поместить данные в БД
        // const { cleanInstagram } = validateServerData(filesLength, instagramAccount || "");

        // if (cleanInstagram) {
        //     formData.append("instagram_account", cleanInstagram);
        // }
        await Promise.all(
            files.map(async (file) => {
                const filePath = chooseFilePath(file);
    
                // почему в кавычках?
                // откуда берется form
                const {data, error } = await supabase.storage
                    .from("memories")
                    .upload(filePath, file)

                if (error) {
                    throw new Error("Upload failed");
                }
            })
        )

        // можно ли унифицировать ответ с бэка
        return {success: true};
    } catch (error: any) {
        // подходит ли это для будущей отладки
        // Нужно ли хранить ошибки в отдельном файле
        console.error("Server Action Error:", error);
        return { success: false, error: error.message || "Something went wrong" }
    }
}