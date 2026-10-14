DROP YOUR PNG ARTWORK HERE
==========================

Put these files in this folder (exact names, case-sensitive):

  Roof.png        -> the roof strip at the bottom of section 0 (Myself)
  LeftBorder.png  -> the long left border used in section 1 (the stage)
  RightBorder.png -> the long right border used in section 1 (the stage)

They are referenced from public/config/pages/main.json as:
  images/ui/Roof.png, images/ui/LeftBorder.png, images/ui/RightBorder.png

Tips
- Borders: make the top and bottom edges match (seamless), because the
  image is repeated vertically while scrolling.
- Roof: a wide strip works best. Its height scales with the width.
- Your portrait is public/images/profile.JPEG (used in section 0).
- After adding files, rebuild or refresh; no code change is needed.
