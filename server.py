from io import BytesIO

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageFilter


app = FastAPI()
rembg_session = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://pixlp.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


def trim_transparent_edges(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image
    return image.crop(bbox)


def pixelate_person(image: Image.Image) -> Image.Image:
    image = trim_transparent_edges(image.convert("RGBA"))

    max_height = 420
    ratio = max_height / image.height
    target_size = (max(1, int(image.width * ratio)), max_height)
    image = image.resize(target_size, Image.Resampling.LANCZOS)

    tiny_width = max(16, target_size[0] // 10)
    tiny_height = max(24, target_size[1] // 10)
    tiny = image.resize((tiny_width, tiny_height), Image.Resampling.NEAREST)

    data = tiny.getdata()
    reduced = []
    for red, green, blue, alpha in data:
        if alpha < 30:
            reduced.append((0, 0, 0, 0))
        else:
            reduced.append((
                round(red / 28) * 28,
                round(green / 28) * 28,
                round(blue / 28) * 28,
                255,
            ))
    tiny.putdata(reduced)

    pixel = tiny.resize(target_size, Image.Resampling.NEAREST)

    alpha = pixel.getchannel("A")
    outline_alpha = alpha.filter(ImageFilter.MaxFilter(5))
    outline = Image.new("RGBA", pixel.size, (18, 12, 12, 255))
    outline.putalpha(outline_alpha)

    canvas = Image.new("RGBA", pixel.size, (0, 0, 0, 0))
    canvas.alpha_composite(outline)
    canvas.alpha_composite(pixel)
    return canvas


def remove_background(raw: bytes) -> bytes:
    global rembg_session
    from rembg import new_session, remove

    if rembg_session is None:
        # u2netp is the lighter person/object segmentation model, better for free CPU servers.
        rembg_session = new_session("u2netp")
    return remove(raw, session=rembg_session)


@app.post("/api/pixel-person")
async def pixel_person(image: UploadFile = File(...)):
    raw = await image.read()

    # AI step: detect the person and remove the background.
    cutout_bytes = remove_background(raw)
    cutout = Image.open(BytesIO(cutout_bytes)).convert("RGBA")

    # PixLP object step: convert the detected person into a pixel object.
    pixel_object = pixelate_person(cutout)

    output = BytesIO()
    pixel_object.save(output, format="PNG")
    return Response(content=output.getvalue(), media_type="image/png")


@app.get("/")
def health_check():
    return {"status": "PixLP AI server is running"}


@app.head("/")
def health_check_head():
    return Response(status_code=200)
