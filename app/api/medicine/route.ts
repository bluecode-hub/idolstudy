import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";

export async function POST(
    req:Request
){
    const body=await req.json();
    const medicine=await prisma.medicine.create({
        data:{
            name:body.name,
            dosage:body.dosage,
            reminderAt:
            body.reminderAt,
        },
    });
    return NextResponse.json(
        medicine
    );

}