"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Group,
  Image as KonvaImage,
  Layer,
  Rect,
  Stage,
  Text,
} from "react-konva";
import useImage from "use-image";
import { remapStaticUrl, useContentFromUrl } from "@/lib/utils";

// Types (should be in types.ts but defining here for now based on schema)
export interface Dropzone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface DraggableItem {
  id: string;
  text: string;
  image?: string;
  width: number;
  height: number;
  initialX: number;
  initialY: number;
  correctDropzoneId?: string;
}

export interface ImageFit {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

export interface DragDropContent {
  image?: string;
  imageFit?: ImageFit;
  dropzones: Dropzone[];
  draggables: DraggableItem[];
}

const URLImage = ({ src, x, y, width, height, ...props }: any) => {
  const [img] = useImage(remapStaticUrl(src));
  return (
    <KonvaImage
      image={img}
      x={x}
      y={y}
      width={width}
      height={height}
      {...props}
    />
  );
};

const DEFAULT_WIDTH = 600;
const DEFAULT_CONTENT: DragDropContent = {
  dropzones: [
    {
      id: "91064b19-1951-48f2-a9e8-edb32023d855",
      x: 236.96078431372538,
      y: 383.2941176470588,
      width: 96.07843137254916,
      height: 29.41176470588241,
      label: "1",
    },
    {
      id: "c43f4f6d-60e2-409b-965b-304de34d7cab",
      x: 372.9901960784314,
      y: 355.33333333333337,
      width: 99.01960784313721,
      height: 33.33333333333336,
      label: "2",
    },
    {
      id: "7e3f3afd-4aba-483b-abc2-ddd6a4073546",
      x: 222.9313725490196,
      y: 302.3333333333333,
      width: 93.13725490196076,
      height: 33.33333333333344,
      label: "3",
    },
  ],
  draggables: [
    {
      id: "5b23d17e-20e9-48f5-869f-7845d73c8cfe",
      text: "عنصر 1",
      width: 100,
      height: 40,
      initialX: 91,
      initialY: 94,
      correctDropzoneId: "91064b19-1951-48f2-a9e8-edb32023d855",
    },
    {
      id: "61d13155-6d9c-4c0e-a4bc-3df6ae71fe0d",
      text: "عنصر 2",
      width: 100,
      height: 40,
      initialX: 208,
      initialY: 93,
      correctDropzoneId: "c43f4f6d-60e2-409b-965b-304de34d7cab",
    },
    {
      id: "f1cd2e6c-753d-4739-ae61-2dd47f32912e",
      text: "عنصر 3",
      width: 100,
      height: 40,
      initialX: 323,
      initialY: 92,
      correctDropzoneId: "7e3f3afd-4aba-483b-abc2-ddd6a4073546",
    },
  ],
  image:
    "https://assets.corrsy.com/ankido/images/1770056334055-background-697aa78e05f6c.png",
  imageFit: {
    x: 92.09621993127149,
    y: 0,
    width: 415.807560137457,
    height: 600,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  },
};

export default function DragInterface(props: { content?: DragDropContent }) {
  // const search = useSearchParams();
  // if (!content || !content?.dropzones) content = { ...DEFAULT_CONTENT };
  const rawContent = useContentFromUrl<DragDropContent>(DEFAULT_CONTENT)

  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleDown, setScaleDown] = useState(1);
  useEffect(() => {
    const sd =
      Math.min(
        window.outerWidth,
        window.innerWidth,
        window.outerHeight,
        window.innerHeight,
      ) / DEFAULT_WIDTH;
    setScaleDown(sd);
    setStageSize({ width: DEFAULT_WIDTH * sd, height: DEFAULT_WIDTH * sd });
  }, []);
  const [stageSize, setStageSize] = useState({
    width: DEFAULT_WIDTH * scaleDown,
    height: DEFAULT_WIDTH * scaleDown,
  }); // Default square
  const [isValidated, setIsValidated] = useState(false);
  const [validationResults, setValidationResults] = useState<
    Record<string, boolean>
  >({});
  const [score, setScore] = useState(0);
  const content = useMemo(() => ({
    ...rawContent,
    draggables: rawContent.draggables.map((d) => ({
      ...d,
      initialX: d.initialX * scaleDown,
      initialY: d.initialY * scaleDown,
      width: d.width * scaleDown,
      height: d.height * scaleDown,
    })),
    dropzones: rawContent.dropzones.map((d) => ({
      ...d,
      x: d.x * scaleDown,
      y: d.y * scaleDown,
      width: d.width * scaleDown,
      height: d.height * scaleDown,
    })),
    imageFit: rawContent.imageFit && {
      ...rawContent.imageFit,
      height: rawContent.imageFit.height * scaleDown,
      width: rawContent.imageFit.width * scaleDown,
      x: rawContent.imageFit.x * scaleDown,
      y: rawContent.imageFit.y * scaleDown,
    },
  }), [rawContent, scaleDown]);

  // Preview state: track positions of draggables independently
  const [previewPositions, setPreviewPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  // Update stage size based on container - FORCE SQUARE ASPECT RATIO
  useEffect(() => {
    // if (containerRef.current) {
    //   const width = containerRef.current.offsetWidth;
    //   setStageSize({
    //     width: width,
    //     height: width, // Square
    //   });
    // }
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <div
        ref={containerRef}
        // className="border rounded-lg overflow-hidden bg-gray-50 relative mx-auto my-auto"
        className="mx-auto my-auto"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center max-w-screen">
          انقل الكلمات الى مكانها الصحيح
        </h1>
        <div style={{ ...stageSize }}>
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={stageRef}
          >
            <Layer>
              {/* Background Image */}
              {content.image && (
                <URLImage
                  src={content.image}
                  x={content.imageFit?.x ?? 0}
                  y={content.imageFit?.y ?? 0}
                  width={content.imageFit?.width ?? stageSize.width}
                  height={content.imageFit?.height ?? stageSize.height}
                  scaleX={content.imageFit?.scaleX ?? 1}
                  scaleY={content.imageFit?.scaleY ?? 1}
                  rotation={content.imageFit?.rotation ?? 0}
                />
              )}

              {/* Dropzones */}
              {content.dropzones?.map((dropzone) => (
                <DropzoneGroup key={dropzone.id} dropzone={dropzone} />
              ))}

              {/* Draggables */}
              {content.draggables?.map((draggable) => {
                // In preview, use local state position
                const currentPos = previewPositions[draggable.id] || {
                  x: draggable.initialX,
                  y: draggable.initialY,
                };

                const isCorrect = validationResults[draggable.id];

                return (
                  <DraggableGroup
                    key={draggable.id}
                    item={{
                      ...draggable,
                      initialX: currentPos.x,
                      initialY: currentPos.y,
                    }}
                    isValidated={isValidated}
                    isCorrect={isCorrect}
                    onDragEnd={(e: any) => {
                      // Find intersecting dropzone
                      let newPos = {
                        x: Math.max(0, Math.min(e.target.x(), stageSize.width - draggable.width)),
                        y: Math.max(0, Math.min(e.target.y(), stageSize.height - draggable.height)),
                      };
                      console.log({ newPos, x: e.target.x(), y: e.target.y() })

                      for (const dz of content.dropzones) {
                        const dzRect = {
                          x: dz.x,
                          y: dz.y,
                          width: dz.width,
                          height: dz.height,
                        };
                        const itemRect = {
                          x: e.target.x(),
                          y: e.target.y(),
                          width: draggable.width,
                          height: draggable.height,
                        };
                        const centerX = itemRect.x + itemRect.width / 2;
                        const centerY = itemRect.y + itemRect.height / 2;

                        if (
                          centerX >= dzRect.x &&
                          centerX <= dzRect.x + dzRect.width &&
                          centerY >= dzRect.y &&
                          centerY <= dzRect.y + dzRect.height
                        ) {
                          // Snapping!
                          const dzCenterX = dzRect.x + dzRect.width / 2;
                          const dzCenterY = dzRect.y + dzRect.height / 2;

                          newPos = {
                            // add a random offset to ensure Konva pushes an update for re-snapping an item to the same dropzone
                            x:
                              dzCenterX -
                              itemRect.width / 2 +
                              Math.random() * 0.001,
                            y:
                              dzCenterY -
                              itemRect.height / 2 +
                              Math.random() * 0.001,
                          };
                          break;
                        }
                      }

                      setPreviewPositions((prev) => ({
                        ...prev,
                        [draggable.id]: newPos,
                      }));
                    }}
                  />
                );
              })}
            </Layer>
          </Stage>
        </div>
      </div>
      {isValidated && (
        <div className="mb-2 p-2">
          النتيجة: {score} من {content.draggables.length}
        </div>
      )}
      {!isValidated ? (
        <Button
          onClick={() => {
            // Validate placements
            const results: Record<string, boolean> = {};
            let correctCount = 0;

            content.draggables.forEach((draggable) => {
              const currentPos = previewPositions[draggable.id] || {
                x: draggable.initialX,
                y: draggable.initialY,
              };

              // Find if item is in its correct dropzone
              let isCorrect = false;
              if (draggable.correctDropzoneId) {
                const correctDropzone = content.dropzones.find(
                  (dz) => dz.id === draggable.correctDropzoneId,
                );

                if (correctDropzone) {
                  const itemRect = {
                    x: currentPos.x,
                    y: currentPos.y,
                    width: draggable.width,
                    height: draggable.height,
                  };
                  const dzRect = {
                    x: correctDropzone.x,
                    y: correctDropzone.y,
                    width: correctDropzone.width,
                    height: correctDropzone.height,
                  };

                  const centerX = itemRect.x + itemRect.width / 2;
                  const centerY = itemRect.y + itemRect.height / 2;

                  isCorrect =
                    centerX >= dzRect.x &&
                    centerX <= dzRect.x + dzRect.width &&
                    centerY >= dzRect.y &&
                    centerY <= dzRect.y + dzRect.height;
                }
              }

              results[draggable.id] = isCorrect;
              if (isCorrect) correctCount++;
            });

            setValidationResults(results);
            setScore(correctCount);
            setIsValidated(true);
          }}
          size="lg"
          className="w-full h-12 px-4 mb-4"
        >
          تدقيق الاجابة
        </Button>
      ) : (
        <Button
          onClick={() => {
            window.location.search = window.location.search + "&success"
          }}
          size="lg"
          className="w-full h-12 px-4 mb-4"
        >
          كمل
        </Button>
      )}
    </main>
  );
}

const DropzoneGroup = ({ dropzone }: { dropzone: Dropzone }) => {
  const shapeRef = useRef<any>(null);

  return (
    <>
      <Group
        id={dropzone.id}
        x={dropzone.x}
        y={dropzone.y}
        width={dropzone.width}
        height={dropzone.height}
        ref={shapeRef}
      >
        <Rect
          width={dropzone.width}
          height={dropzone.height}
          fill="rgba(0, 150, 255, 0.2)"
          stroke={"#999"}
          strokeWidth={2}
          dash={[5, 5]}
          cornerRadius={5}
        />
        <Text
          text={dropzone.label}
          width={dropzone.width}
          height={dropzone.height}
          align="center"
          verticalAlign="middle"
          fontSize={14}
          fill="#333"
        />
      </Group>
    </>
  );
};

const DraggableGroup = ({
  item,
  onDragEnd,
  isValidated,
  isCorrect,
}: {
  item: DraggableItem;
  onDragEnd?: (e: any) => void;
  isValidated?: boolean;
  isCorrect?: boolean;
}) => {
  const shapeRef = useRef<any>(null);

  // Determine color based on validation state
  let fillColor = "#FFF";
  let borderColor = "#333";

  if (isValidated) {
    if (isCorrect) {
      fillColor = "#dcfce7"; // light green
      borderColor = "#16a34a"; // darker green
    } else {
      fillColor = "#fee2e2"; // light red
      borderColor = "#dc2626"; // darker red
    }
  }

  return (
    <Group
      key={Date.now()}
      id={item.id}
      draggable={!isValidated}
      x={item.initialX}
      y={item.initialY}
      width={item.width}
      height={item.height}
      onDragEnd={onDragEnd}
      ref={shapeRef}
    >
      <Rect
        width={item.width}
        height={item.height}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={isValidated ? 3 : 1}
        shadowColor="black"
        shadowBlur={5}
        shadowOpacity={0.2}
        cornerRadius={4}
      />
      <Text
        text={item.text}
        width={item.width}
        height={item.height}
        align="center"
        verticalAlign="middle"
        fontSize={14}
        fill={
          isValidated && isCorrect
            ? "#16a34a"
            : isValidated && !isCorrect
              ? "#dc2626"
              : "#000"
        }
      />
    </Group>
  );
};
